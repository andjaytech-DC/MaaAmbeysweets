<?php

namespace App\Http\Controllers\Marketing;

use App\Models\AffiliateCode;
use App\Models\CollaborationEvent;
use App\Models\Collaboration;
use App\Models\CommissionRecord;
use App\Models\Creator;
use App\Models\CreatorApplication;
use App\Models\MarketingClick;
use App\Models\MarketingExpense;
use App\Models\MarketingSetting;
use App\Models\ProductSample;
use App\Models\PublishedContent;
use App\Models\SampleItem;
use Illuminate\Http\Request;

/**
 * Every figure is computed from records in this system. Each metric says how far it can be trusted:
 *   verified          counted by this website (our own orders, code use, clicks, collaboration records)
 *   recorded          typed in by the admin (costs, fees)
 *   creator_reported  numbers a creator gave us
 *   estimated         a ratio or guess, with the reason shown
 * Reach, impressions, followers and engagement are never invented: they only appear if someone entered them.
 */
class AnalyticsController extends MarketingController
{
    private const SAMPLE_SENT = ['dispatched', 'delivered', 'review_pending', 'review_submitted', 'completed'];

    public function analytics(Request $request)
    {
        $cid = $request->filled('campaign_id') ? (int) $request->query('campaign_id') : null;
        $byCampaign = fn ($q) => $cid ? $q->where('campaign_id', $cid) : $q;

        $collabs = $byCampaign(Collaboration::query());
        $invited = (clone $collabs)->count();
        $accepted = (clone $collabs)->whereNotNull('responded_at')->where('status', '!=', 'declined')->count();
        $declined = (clone $collabs)->where('status', 'declined')->count();

        $sentSamples = $byCampaign(ProductSample::query())->whereIn('status', self::SAMPLE_SENT);
        $sampleCount = (clone $sentSamples)->count();
        $unitsSampled = (int) SampleItem::whereIn('product_sample_id', (clone $sentSamples)->pluck('id'))->sum('quantity');
        $sampleCost = (float) (clone $sentSamples)->sum('sample_value');
        $shipping = (float) (clone $sentSamples)->sum('shipping_charge');

        $paidQ = $byCampaign(Collaboration::query())->where('compensation_type', 'paid');
        $paidCollab = (float) (clone $paidQ)->where('payment_status', 'paid')->sum('agreed_fee');
        $paidCommitted = (float) (clone $paidQ)->where('payment_status', 'pending')->whereNotIn('status', ['declined', 'cancelled'])->sum('agreed_fee');
        $other = (float) $byCampaign(MarketingExpense::query())->sum('amount');
        $totalCost = $sampleCost + $shipping + $paidCollab + $other;

        $content = $byCampaign(PublishedContent::query())->where('approval_status', 'approved');
        $byType = (clone $content)->selectRaw('content_type, count(*) as n')->groupBy('content_type')->pluck('n', 'content_type');
        $n = fn (array $types) => (int) collect($types)->sum(fn ($t) => $byType[$t] ?? 0);

        $codes = AffiliateCode::with('coupon:id,code')->when($cid, fn ($q) => $q->where('campaign_id', $cid))->get();
        $stats = AffiliateController::stats($codes->pluck('coupon.code')->filter()->all());
        $orders = (int) collect($stats)->sum('orders');
        $revenue = round((float) collect($stats)->sum('revenue'), 2);
        $clicks = MarketingClick::whereIn('affiliate_code_id', $codes->pluck('id'))->count();
        $comm = CommissionRecord::whereIn('affiliate_code_id', $codes->pluck('id'))->whereIn('status', ['pending', 'approved', 'paid']);

        $m = fn (string $key, string $label, $value, string $basis, ?string $note = null) => compact('key', 'label', 'value', 'basis', 'note');

        return [
            'campaign_id' => $cid,
            'sections' => [
                ['title' => 'Creators', 'metrics' => [
                    $m('invited', 'Creators invited', $invited, 'verified'),
                    $m('accepted', 'Accepted collaborations', $accepted, 'verified'),
                    $m('declined', 'Declined', $declined, 'verified'),
                ]],
                ['title' => 'Sampling', 'metrics' => [
                    $m('samples', 'Sample packages sent', $sampleCount, 'verified', 'Counted once dispatched'),
                    $m('units', 'Products sampled (units)', $unitsSampled, 'verified'),
                ]],
                ['title' => 'Published content (approved)', 'metrics' => [
                    $m('blogs', 'Blog articles', $n(['blog_article']), 'verified'),
                    $m('videos', 'Videos and Reels', $n(['youtube_video', 'youtube_short', 'instagram_reel', 'facebook_video']), 'verified'),
                    $m('posts', 'Social posts and other', $n(['instagram_post', 'facebook_post', 'other']), 'verified'),
                    $m('pending_content', 'Waiting for review', $byCampaign(PublishedContent::query())->where('approval_status', 'pending')->count(), 'verified'),
                ]],
                ['title' => 'Costs (₹)', 'metrics' => [
                    $m('cost_sampling', 'Sweets sent (value)', $sampleCost, 'recorded', 'Value entered on each sample package'),
                    $m('cost_shipping', 'Shipping', $shipping, 'recorded'),
                    $m('cost_paid', 'Paid collaborations (paid)', $paidCollab, 'recorded'),
                    $m('cost_paid_owed', 'Paid collaborations (agreed, not yet paid)', $paidCommitted, 'recorded'),
                    $m('cost_other', 'Other expenses', $other, 'recorded'),
                    $m('cost_total', 'Total spent so far', $totalCost, 'recorded', 'Excludes agreed fees not yet paid and unapproved commission'),
                ]],
                ['title' => 'Sales from creator codes', 'metrics' => [
                    $m('clicks', 'Visits with a creator link', $clicks, 'verified', 'Counted once per browser session by this website'),
                    $m('orders', 'Orders using a creator code', $orders, 'verified', 'Cancelled orders excluded'),
                    $m('revenue', 'Revenue from those orders (₹)', $revenue, 'verified'),
                    $m('conversion', 'Orders per visit', $clicks > 0 ? round($orders / $clicks * 100, 1) : null, 'estimated', $clicks > 0 ? 'Orders and visits are counted separately, so this is only a rough guide (%).' : 'Not enough data: no tracked visits yet.'),
                    $m('commission_open', 'Commission owed (₹)', round((float) (clone $comm)->whereIn('status', ['pending', 'approved'])->sum('amount'), 2), 'recorded'),
                    $m('commission_paid', 'Commission paid (₹)', round((float) (clone $comm)->where('status', 'paid')->sum('amount'), 2), 'recorded'),
                ]],
            ],
            'content_metrics' => $this->contentMetrics($cid),
            'budget' => $cid ? \App\Models\Campaign::where('id', $cid)->value('budget') : null,
            'note' => 'Reach, impressions and engagement are only shown when someone entered them, and always with where they came from.',
        ];
    }

    /** Views and engagement per source. Each bucket is separate on purpose; they are never added together. */
    private function contentMetrics(?int $cid): array
    {
        $out = [];
        foreach (PublishedContent::SOURCES as $src) {
            $q = PublishedContent::where('approval_status', 'approved')->where('metrics_source', $src)->when($cid, fn ($q) => $q->where('campaign_id', $cid));
            $out[$src] = ['items' => (clone $q)->count(), 'views' => (int) (clone $q)->sum('views'), 'likes' => (int) (clone $q)->sum('likes'), 'comments' => (int) (clone $q)->sum('comments'), 'shares' => (int) (clone $q)->sum('shares'), 'clicks' => (int) (clone $q)->sum('clicks')];
        }

        return $out;
    }

    public function dashboard()
    {
        $remindDays = max(1, (int) (MarketingSetting::get('reminder_after_days') ?: 7));
        $due = ProductSample::with(['creator:id,name', 'campaign:id,name'])
            ->whereIn('status', ['delivered', 'review_pending'])->whereNotNull('collaboration_id')->whereNotNull('delivered_on')
            ->whereDate('delivered_on', '<=', now()->subDays($remindDays)->toDateString())
            ->whereHas('creator')->get()
            ->filter(function (ProductSample $s) {
                $c = Collaboration::find($s->collaboration_id);

                return $c && in_array($c->status, ['approved'], true) && (! $c->reminder_sent_at || $c->reminder_sent_at->lt(now()->subDays(7)));
            })->map(fn ($s) => ['collaboration_id' => $s->collaboration_id, 'creator' => $s->creator->name, 'campaign' => $s->campaign?->name, 'delivered_on' => $s->delivered_on->format('Y-m-d')])->values();

        return [
            'counts' => [
                'new_applications' => CreatorApplication::where('status', 'new')->count(),
                'creators' => Creator::count(),
                'creators_active' => Creator::where('status', 'active')->count(),
                'campaigns_live' => \App\Models\Campaign::whereIn('status', ['open', 'recruiting', 'active'])->count(),
                'awaiting_approval' => Collaboration::where('status', 'accepted')->count(),
                'samples_to_send' => ProductSample::whereIn('status', ['requested', 'approved', 'preparing'])->count(),
                'samples_in_transit' => ProductSample::where('status', 'dispatched')->count(),
                'content_pending' => PublishedContent::where('approval_status', 'pending')->count(),
                'featured_reviews' => PublishedContent::where('is_featured', true)->count(),
            ],
            'reminders_due' => $due,
            'timeline' => CollaborationEvent::with('collaboration.creator:id,name', 'collaboration.campaign:id,name')->orderByDesc('id')->limit(25)->get()->map(fn ($e) => [
                'id' => $e->id, 'label' => $e->label, 'note' => $e->note, 'actor' => $e->actor, 'at' => $e->created_at,
                'creator' => $e->collaboration?->creator?->name, 'campaign' => $e->collaboration?->campaign?->name, 'collaboration_id' => $e->collaboration_id,
            ]),
            'workflow' => ['Campaign created', 'Creators chosen', 'Invitation sent', 'Creator accepts or declines', 'Admin approves', 'Sweets chosen', 'Shipment recorded', 'Creator receives', 'Creator publishes', 'Links submitted', 'Admin reviews', 'Performance tracked', 'Payment or reward recorded', 'Completed'],
        ];
    }
}
