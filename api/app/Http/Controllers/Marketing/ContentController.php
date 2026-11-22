<?php

namespace App\Http\Controllers\Marketing;

use App\Models\Collaboration;
use App\Models\PublishedContent;
use App\Services\ImageField;
use App\Services\SocialUrl;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Published reviews: what creators posted, whether we may reuse it, and which ones are featured on the website. */
class ContentController extends MarketingController
{
    public function index(Request $request)
    {
        $q = PublishedContent::with(['creator:id,name', 'campaign:id,name', 'products:id,name'])->orderByDesc('id');
        foreach (['campaign_id', 'creator_id'] as $k) {
            if ($request->filled($k)) {
                $q->where($k, (int) $request->query($k));
            }
        }
        if ($request->filled('approval_status') && in_array($request->query('approval_status'), ['pending', 'approved', 'rejected'], true)) {
            $q->where('approval_status', $request->query('approval_status'));
        }
        if ($request->boolean('featured')) {
            $q->where('is_featured', true);
        }

        return $q->limit(500)->get();
    }

    public function store(Request $request)
    {
        $v = $this->validated($request, true);
        $m = new PublishedContent($this->row($v, null) + ['submitted_by' => 'admin']);

        return response()->json($this->persist($m, $v, $request), 201);
    }

    public function update(Request $request, PublishedContent $content)
    {
        $v = $this->validated($request, false);
        $content->fill($this->row($v, $content));

        return $this->persist($content, $v, $request);
    }

    public function destroy(PublishedContent $content)
    {
        ImageField::cleanup([$content->thumbnail_path, $content->thumbnail_variants]);
        $content->delete();

        return response()->noContent();
    }

    private function validated(Request $request, bool $creating): array
    {
        $r = $creating ? 'required' : 'sometimes';

        return $request->validate([
            'creator_id' => [$r, 'integer', 'exists:creators,id'],
            'campaign_id' => ['nullable', 'integer', 'exists:campaigns,id'],
            'collaboration_id' => ['nullable', 'integer', 'exists:collaborations,id'],
            'content_type' => [$r, Rule::in(PublishedContent::TYPES)],
            'url' => [$r, 'string', 'max:500'],
            'published_on' => ['nullable', 'date'],
            'title' => ['nullable', 'string', 'max:160'],
            'summary' => ['nullable', 'string', 'max:1000'],
            'approval_status' => ['nullable', Rule::in(['pending', 'approved', 'rejected'])],
            'usage_permission' => ['nullable', 'boolean'],
            'permission_note' => ['nullable', 'string', 'max:300'],
            'is_featured' => ['nullable', 'boolean'],
            'featured_order' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'views' => ['nullable', 'integer', 'min:0'], 'likes' => ['nullable', 'integer', 'min:0'], 'comments' => ['nullable', 'integer', 'min:0'],
            'shares' => ['nullable', 'integer', 'min:0'], 'clicks' => ['nullable', 'integer', 'min:0'],
            'metrics_source' => ['nullable', Rule::in(PublishedContent::SOURCES)],
            'metrics_note' => ['nullable', 'string', 'max:300'],
            'product_ids' => ['nullable', 'array', 'max:30'],
            'product_ids.*' => ['integer', 'exists:products,id'],
            'thumbnail' => ['nullable', 'file', 'max:'.(int) config('media.max_kb', 5120)],
        ]);
    }

    private function row(array $v, ?PublishedContent $existing): array
    {
        $row = collect($v)->except(['product_ids', 'thumbnail'])->all();
        // Tie the post to the creator's collaboration for that campaign, so the timeline and workflow follow it.
        $creatorId = $row['creator_id'] ?? $existing?->creator_id;
        $campaignId = array_key_exists('campaign_id', $row) ? $row['campaign_id'] : $existing?->campaign_id;
        if (empty($row['collaboration_id']) && ! $existing?->collaboration_id && $creatorId && $campaignId) {
            $row['collaboration_id'] = Collaboration::where('creator_id', $creatorId)->where('campaign_id', $campaignId)->value('id');
        }
        if (array_key_exists('url', $row) || array_key_exists('content_type', $row)) {
            $type = $row['content_type'] ?? $existing?->content_type;
            $url = $this->link(SocialUrl::platformOfContent((string) $type) ?? 'other', $row['url'] ?? $existing?->url, 'url');
            if (PublishedContent::where('url', $url)->when($existing, fn ($q) => $q->where('id', '!=', $existing->id))->exists()) {
                $this->fail('url', 'This link is already in the list.');
            }
            $row['url'] = $url;
        }
        foreach (['creator_id', 'content_type', 'approval_status'] as $k) {
            if (array_key_exists($k, $row) && $row[$k] === null) {
                unset($row[$k]);
            }
        }
        // Any metric needs its source stated; we never guess one.
        $hasMetric = collect(['views', 'likes', 'comments', 'shares', 'clicks'])->contains(fn ($k) => ($row[$k] ?? null) !== null);
        if ($hasMetric && empty($row['metrics_source'] ?? $existing?->metrics_source)) {
            $this->fail('metrics_source', 'Say where these numbers came from: verified, reported by the creator, or an estimate.');
        }

        return $row;
    }

    private function persist(PublishedContent $m, array $v, Request $request): PublishedContent
    {
        $before = $m->exists ? $m->getOriginal('approval_status') : null;

        if (array_key_exists('usage_permission', $v)) {
            $granted = (bool) $v['usage_permission'];
            if ($granted && ! $m->getOriginal('usage_permission')) {
                $m->permission_at = now();
            }
            if (! $granted) {
                $m->permission_at = null;
            }
            $m->usage_permission = $granted;
        }
        $m->approval_status = $m->approval_status ?: 'pending';

        // Only approved content that the creator allowed us to reuse can be shown on the website.
        $wantsFeature = array_key_exists('is_featured', $v) ? (bool) $v['is_featured'] : (bool) $m->is_featured;
        if ($wantsFeature && ($m->approval_status !== 'approved' || ! $m->usage_permission)) {
            if (array_key_exists('is_featured', $v) && $v['is_featured']) {
                $this->fail('is_featured', 'Only approved content with the creator\'s permission to reuse it can be featured on the website.');
            }
            $wantsFeature = false; // approval or permission was withdrawn: take it off the website
        }
        $m->is_featured = $wantsFeature;

        $old = $this->picture(fn () => ImageField::apply($m, 'thumbnail', $request, 'media/creator-content', 200), 'thumbnail');
        $m->save();
        ImageField::cleanup($old);
        if (array_key_exists('product_ids', $v) || $request->has('product_ids_present')) {
            $m->products()->sync(array_values(array_unique($v['product_ids'] ?? [])));
        }

        if ($m->collaboration_id && $m->approval_status === 'approved' && $before !== 'approved' && ($c = Collaboration::find($m->collaboration_id))) {
            $c->log('Content approved', $m->title);
            if ($c->status === 'content_submitted' || $c->status === 'approved') {
                $c->update(['status' => 'content_approved']);
            }
        }

        return $m->fresh(['creator:id,name', 'campaign:id,name', 'products:id,name']);
    }

    // ---------- Public ----------

    /** GET /api/creator-stories - featured, approved, permission-granted only. Contact details are never included. */
    public function stories()
    {
        $items = PublishedContent::with(['creator:id,name,photo_path,photo_variants', 'products:id,name'])
            ->where('is_featured', true)->where('approval_status', 'approved')->where('usage_permission', true)
            ->orderBy('featured_order')->orderByDesc('id')->limit(12)->get();

        $collabs = Collaboration::whereIn('id', $items->pluck('collaboration_id')->filter())->pluck('compensation_type', 'id');

        return $items->map(fn (PublishedContent $c) => [
            'id' => $c->id,
            'creator_name' => $c->creator->name,
            'creator_photo_url' => $c->creator->photo_url,
            'content_type' => $c->content_type,
            'url' => $c->url,
            'title' => $c->title,
            'summary' => $c->summary,
            'thumbnail_url' => $c->thumbnail_url,
            'products' => $c->products->pluck('name'),
            'published_on' => $c->published_on?->format('Y-m-d'),
            'disclosure' => match ($collabs[$c->collaboration_id] ?? null) {
                'paid' => 'Paid collaboration',
                'affiliate' => 'Affiliate partner: earns a commission on orders',
                'gifted' => 'Received free sweets',
                default => 'Collaboration with Maa Ambey Sweets',
            },
        ])->values();
    }
}
