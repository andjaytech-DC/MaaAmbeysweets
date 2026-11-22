<?php

namespace App\Http\Controllers\Marketing;

use App\Models\SocialChannel;
use App\Services\ImageField;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** The shop's own official accounts. Nothing is pre-filled: only links the owner enters are ever shown. */
class SocialChannelController extends MarketingController
{
    /** GET /api/social-channels */
    public function publicIndex()
    {
        return response()->json(
            SocialChannel::where('is_active', true)->orderBy('sort_order')->orderBy('id')->get(['id', 'platform', 'account_name', 'display_name', 'profile_url', 'channel_url', 'image_path', 'image_variants', 'description'])
        )->header('Cache-Control', 'public, max-age=60');
    }

    public function index()
    {
        return SocialChannel::orderBy('sort_order')->orderBy('id')->get();
    }

    public function store(Request $request)
    {
        $v = $this->validated($request, true);
        $c = new SocialChannel($v + ['sort_order' => (int) SocialChannel::max('sort_order') + 1]);
        $this->picture(fn () => ImageField::apply($c, 'image', $request, 'media/social', 32));
        $c->save();

        return response()->json($c->fresh(), 201);
    }

    public function update(Request $request, SocialChannel $channel)
    {
        $channel->fill($this->validated($request, false, $channel));
        $old = $this->picture(fn () => ImageField::apply($channel, 'image', $request, 'media/social', 32));
        $channel->save();
        ImageField::cleanup($old);

        return $channel->fresh();
    }

    public function destroy(SocialChannel $channel)
    {
        ImageField::cleanup([$channel->image_path, $channel->image_variants]);
        $channel->delete();

        return response()->noContent();
    }

    public function reorder(Request $request)
    {
        $ids = $request->validate(['ids' => ['required', 'array', 'max:100'], 'ids.*' => ['integer', 'distinct']])['ids'];
        DB::transaction(function () use ($ids) {
            foreach (array_values($ids) as $i => $id) {
                SocialChannel::where('id', $id)->update(['sort_order' => $i + 1]);
            }
        });

        return $this->index();
    }

    private function validated(Request $request, bool $creating, ?SocialChannel $existing = null): array
    {
        $r = $creating ? 'required' : 'sometimes';
        $v = $request->validate([
            'platform' => [$r, Rule::in(SocialChannel::PLATFORMS)],
            'account_name' => [$r, 'string', 'max:120'],
            'display_name' => ['nullable', 'string', 'max:120'],
            'profile_url' => [$r, 'string', 'max:300'],
            'channel_url' => ['nullable', 'string', 'max:300'],
            'description' => ['nullable', 'string', 'max:300'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'image' => ['nullable', 'file', 'max:'.(int) config('media.max_kb', 5120)],
        ]);
        unset($v['image']);
        $platform = $v['platform'] ?? $existing?->platform;
        foreach (['profile_url', 'channel_url'] as $f) {
            if (array_key_exists($f, $v)) {
                $v[$f] = $this->link($platform, $v[$f], $f);
            }
        }
        foreach (['platform', 'account_name', 'profile_url', 'is_active', 'sort_order'] as $k) {
            if (array_key_exists($k, $v) && $v[$k] === null) {
                unset($v[$k]);
            }
        }

        return $v;
    }
}
