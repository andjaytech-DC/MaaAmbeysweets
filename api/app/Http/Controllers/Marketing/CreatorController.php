<?php

namespace App\Http\Controllers\Marketing;

use App\Models\Creator;
use App\Services\ImageField;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Admin: the creator directory. Nothing here is invented: audience numbers are only what the creator reported. */
class CreatorController extends MarketingController
{
    public function index(Request $request)
    {
        $q = Creator::with('profiles')->orderByDesc('id');
        if ($s = trim((string) $request->query('q'))) {
            $q->where(fn ($w) => $w->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")->orWhere('city', 'like', "%{$s}%")->orWhere('blog_name', 'like', "%{$s}%"));
        }
        if ($request->filled('status') && in_array($request->query('status'), Creator::STATUSES, true)) {
            $q->where('status', $request->query('status'));
        }
        if ($request->filled('type') && in_array($request->query('type'), Creator::TYPES, true)) {
            $q->where('type', $request->query('type'));
        }

        return $q->limit(500)->get();
    }

    public function show(Creator $creator)
    {
        $creator->load(['profiles', 'collaborations.campaign:id,name,status']);

        return $creator;
    }

    public function store(Request $request)
    {
        $d = $this->data($request, true);
        if (! empty($d['email']) && Creator::where('email', $d['email'])->exists()) {
            $this->fail('email', 'A creator with this email is already in the directory.');
        }
        $creator = new Creator($d['row'] + ['source' => 'admin']);
        $this->picture(fn () => ImageField::apply($creator, 'photo', $request, 'media/creators'), 'photo');
        $creator->save();
        $creator->syncProfiles($d['profiles']);

        return response()->json($creator->fresh('profiles'), 201);
    }

    public function update(Request $request, Creator $creator)
    {
        $d = $this->data($request, false);
        if (! empty($d['email']) && Creator::where('email', $d['email'])->where('id', '!=', $creator->id)->exists()) {
            $this->fail('email', 'Another creator already uses this email.');
        }
        $creator->fill($d['row']);
        $old = $this->picture(fn () => ImageField::apply($creator, 'photo', $request, 'media/creators'), 'photo');
        $creator->save();
        ImageField::cleanup($old);
        $creator->syncProfiles($d['profiles']);

        return $creator->fresh('profiles');
    }

    public function destroy(Creator $creator)
    {
        if ($creator->collaborations()->exists() || \App\Models\ProductSample::where('creator_id', $creator->id)->exists() || \App\Models\PublishedContent::where('creator_id', $creator->id)->exists()) {
            $this->fail('creator', 'This creator has campaign history, samples or content, so it is kept. Set the status to Rejected or Completed instead.');
        }
        ImageField::cleanup([$creator->photo_path, $creator->photo_variants]);
        $creator->delete();

        return response()->noContent();
    }

    private function data(Request $request, bool $creating): array
    {
        $req = $creating ? 'required' : 'sometimes';
        $v = $request->validate([
            'name' => [$req, 'string', 'max:120'],
            'type' => ['nullable', Rule::in(Creator::TYPES)],
            'blog_name' => ['nullable', 'string', 'max:120'],
            'blog_url' => ['nullable', 'string', 'max:300'],
            'email' => ['nullable', 'email:rfc', 'max:190'],
            'phone' => ['nullable', 'string', 'max:30'],
            'city' => ['nullable', 'string', 'max:80'],
            'state' => ['nullable', 'string', 'max:80'],
            'country' => ['nullable', 'string', 'max:80'],
            'language' => ['nullable', 'string', 'max:60'],
            'content_category' => ['nullable', 'string', 'max:80'],
            'audience_size' => ['nullable', 'integer', 'min:0', 'max:4000000000'],
            'audience_note' => ['nullable', 'string', 'max:200'],
            'avg_views' => ['nullable', 'integer', 'min:0', 'max:4000000000'],
            'engagement_note' => ['nullable', 'string', 'max:300'],
            'collaboration_preferences' => ['nullable', 'string', 'max:2000'],
            'proposed_price' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'status' => ['nullable', Rule::in(Creator::STATUSES)],
            'internal_notes' => ['nullable', 'string', 'max:4000'],
            'instagram_url' => ['nullable', 'string', 'max:300'],
            'youtube_url' => ['nullable', 'string', 'max:300'],
            'facebook_url' => ['nullable', 'string', 'max:300'],
            'other_profiles' => ['nullable'],
            'photo' => ['nullable', 'file', 'max:'.(int) config('media.max_kb', 5120)],
        ]);

        $row = collect($v)->except(['instagram_url', 'youtube_url', 'facebook_url', 'other_profiles', 'photo'])->all();
        foreach (['name', 'type', 'country', 'status'] as $k) {   // never blank out a required column
            if (array_key_exists($k, $row) && $row[$k] === null) {
                unset($row[$k]);
            }
        }
        if (array_key_exists('blog_url', $row)) {
            $row['blog_url'] = $this->link('blog', $row['blog_url'], 'blog_url');
        }
        if (array_key_exists('phone', $row)) {
            $row['phone'] = $this->phone($row['phone']);
        }

        $profiles = [];
        foreach (['instagram', 'youtube', 'facebook'] as $p) {
            if (array_key_exists("{$p}_url", $v)) {
                $profiles[$p] = $this->link($p, $v["{$p}_url"], "{$p}_url");
            }
        }
        if (array_key_exists('other_profiles', $v)) {
            $lines = is_array($v['other_profiles']) ? $v['other_profiles'] : preg_split('/[\r\n,]+/', (string) $v['other_profiles']);
            $profiles['other'] = collect($lines)->map(fn ($l) => $this->link('other', trim((string) $l), 'other_profiles'))->filter()->take(10)->values()->all();
        }

        return ['row' => $row, 'profiles' => $profiles, 'email' => $row['email'] ?? null];
    }
}
