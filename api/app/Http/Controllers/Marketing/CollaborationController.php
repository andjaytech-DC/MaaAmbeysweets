<?php

namespace App\Http\Controllers\Marketing;

use App\Models\Collaboration;
use App\Models\Creator;
use App\Models\MarketingSetting;
use App\Models\PublishedContent;
use App\Services\MarketingMail;
use App\Services\SocialUrl;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Admin side of a collaboration, plus the private-link pages the creator uses (no creator login is needed). */
class CollaborationController extends MarketingController
{
    // ---------- Admin ----------

    public function index(Request $request)
    {
        $q = Collaboration::with(['creator:id,name,city,status', 'campaign:id,name,status'])->orderByDesc('id');
        foreach (['campaign_id', 'creator_id'] as $k) {
            if ($request->filled($k)) {
                $q->where($k, (int) $request->query($k));
            }
        }
        if ($request->filled('status') && in_array($request->query('status'), Collaboration::STATUSES, true)) {
            $q->where('status', $request->query('status'));
        }

        return $q->limit(500)->get();
    }

    public function show(Collaboration $collaboration)
    {
        $collaboration->load(['creator', 'campaign.products:id,name', 'events', 'samples.items', 'contents']);
        $collaboration->setAttribute('link', MarketingMail::collabLink($collaboration->token));
        $collaboration->setAttribute('allowed_next', Collaboration::NEXT[$collaboration->status] ?? []);

        return $collaboration;
    }

    public function update(Request $request, Collaboration $collaboration)
    {
        $v = $request->validate([
            'status' => ['nullable', Rule::in(Collaboration::STATUSES)],
            'compensation_type' => ['nullable', Rule::in(['gifted', 'paid', 'affiliate'])],
            'agreed_fee' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'payment_status' => ['nullable', Rule::in(['not_applicable', 'pending', 'paid'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
        $c = $collaboration;

        if (array_key_exists('compensation_type', $v) && $v['compensation_type']) {
            $c->compensation_type = $v['compensation_type'];
            if ($v['compensation_type'] !== 'paid') {
                $c->agreed_fee = null;
                if ($c->payment_status !== 'paid') {
                    $c->payment_status = 'not_applicable';
                }
            }
        }
        if (array_key_exists('agreed_fee', $v) && $c->compensation_type === 'paid') {
            $c->agreed_fee = $v['agreed_fee'];
        }
        if (array_key_exists('notes', $v)) {
            $c->notes = $v['notes'];
        }
        if (! empty($v['payment_status']) && $v['payment_status'] !== $c->payment_status) {
            if ($c->compensation_type !== 'paid' && $v['payment_status'] !== 'not_applicable') {
                $this->fail('payment_status', 'Payment applies only to paid collaborations.');
            }
            $c->payment_status = $v['payment_status'];
            $c->paid_at = $v['payment_status'] === 'paid' ? now() : null;
            $c->log('Payment marked '.$v['payment_status']);
        }

        $creatorMail = null;
        if (! empty($v['status']) && $v['status'] !== $c->status) {
            $to = $v['status'];
            if (! in_array($to, Collaboration::NEXT[$c->status] ?? [], true)) {
                $this->fail('status', 'A collaboration that is '.str_replace('_', ' ', $c->status).' cannot be moved to '.str_replace('_', ' ', $to).'.');
            }
            if ($to === 'completed') {
                if ($c->compensation_type === 'paid' && (float) $c->agreed_fee > 0 && $c->payment_status !== 'paid') {
                    $this->fail('status', 'Record the payment as paid before completing a paid collaboration.');
                }
                $c->completed_at = now();
            }
            if ($to === 'approved' && $c->status === 'accepted') {
                $c->approved_at = now();
                $creatorMail = 'confirmed';
            }
            $c->log('Status: '.str_replace('_', ' ', $to), null);
            $c->status = $to;
        }
        $c->save();

        $creator = $c->creator;
        if ($c->status === 'approved' && in_array($creator->status, ['new', 'contacted', 'interested', 'negotiating', 'approved'], true)) {
            $creator->update(['status' => 'active']);
        }
        if ($c->status === 'completed' && ! Collaboration::where('creator_id', $creator->id)->whereIn('status', ['invited', 'accepted', 'approved', 'content_submitted', 'content_approved'])->exists()) {
            $creator->update(['status' => 'completed']);
        }
        if ($creatorMail === 'confirmed') {
            MarketingMail::send($creator->email, 'Collaboration confirmed: '.$c->campaign->name, "Hello {$creator->name},\n\nYour collaboration for \"{$c->campaign->name}\" is confirmed. We will arrange your sweets next and tell you when they are on their way.\n\nWhen you have published, please add your links here:\n".MarketingMail::collabLink($c->token));
        }
        if ($c->status === 'completed') {
            MarketingMail::send($creator->email, 'Collaboration completed: '.$c->campaign->name, "Hello {$creator->name},\n\nThank you for working with us on \"{$c->campaign->name}\". This collaboration is now complete.");
        }

        return $this->show($c->fresh());
    }

    /** Nudge a creator who has received their sweets but not yet sent links. */
    public function remind(Collaboration $collaboration)
    {
        if (! in_array($collaboration->status, ['approved', 'content_submitted'], true)) {
            $this->fail('status', 'Reminders are for approved collaborations.');
        }
        $c = $collaboration->load('creator', 'campaign');
        $sent = MarketingMail::send($c->creator->email, 'A gentle reminder: '.$c->campaign->name, "Hello {$c->creator->name},\n\nA friendly reminder about \"{$c->campaign->name}\". When you have published your content, please add the links here:\n".MarketingMail::collabLink($c->token));
        if ($sent) {
            $c->update(['reminder_sent_at' => now()]);
        }
        $c->log($sent ? 'Review reminder emailed' : 'Reminder not sent', $sent ? null : 'No email on file or email is not configured.', 'system');

        return ['email_sent' => $sent];
    }

    // ---------- Creator (private link) ----------

    private function byToken(string $token): Collaboration
    {
        return Collaboration::where('token', $token)->with(['campaign.products:id,name', 'creator:id,name'])->firstOrFail();
    }

    /** GET /api/creator/collaborations/{token} - nothing here reveals contact details. */
    public function publicShow(string $token)
    {
        $c = $this->byToken($token);

        return [
            'creator_name' => $c->creator->name,
            'status' => $c->status,
            'compensation_type' => $c->compensation_type,
            'agreed_fee' => $c->compensation_type === 'paid' ? $c->agreed_fee : null,
            'campaign' => [
                'name' => $c->campaign->name, 'description' => $c->campaign->description, 'objective' => $c->campaign->objective,
                'starts_at' => $c->campaign->starts_at?->format('Y-m-d'), 'ends_at' => $c->campaign->ends_at?->format('Y-m-d'),
                'image_url' => $c->campaign->image_url, 'products' => $c->campaign->products->pluck('name'),
            ],
            'sample_sent' => $c->samples()->whereIn('status', ['dispatched', 'delivered', 'review_pending', 'review_submitted', 'completed'])->exists(),
            'receipt_confirmed' => $c->samples()->whereNotNull('receipt_confirmed_at')->exists(),
            'submitted' => $c->contents()->get(['content_type', 'url', 'title', 'approval_status'])->all(),
            'disclosure_text' => MarketingSetting::get('disclosure_text'),
            'content_types' => PublishedContent::TYPES,
        ];
    }

    public function publicRespond(Request $request, string $token)
    {
        $v = $request->validate(['action' => ['required', 'in:accept,decline']]);
        $c = $this->byToken($token);
        if ($c->status !== 'invited') {
            $this->fail('action', 'You have already replied to this invitation.');
        }
        $accept = $v['action'] === 'accept';
        $c->update(['status' => $accept ? 'accepted' : 'declined', 'responded_at' => now()]);
        $c->log($accept ? 'Creator accepted the invitation' : 'Creator declined the invitation', null, 'creator');
        MarketingMail::notifyAdmin(($accept ? 'Accepted: ' : 'Declined: ').$c->campaign->name, "{$c->creator->name} ".($accept ? 'accepted' : 'declined')." the invitation to \"{$c->campaign->name}\".");

        return ['status' => $c->status];
    }

    /** The creator says the sweets reached them. Recorded separately; it does not change any status by itself. */
    public function publicConfirmReceipt(string $token)
    {
        $c = $this->byToken($token);
        $n = $c->samples()->whereIn('status', ['dispatched', 'delivered', 'review_pending', 'review_submitted', 'completed'])->whereNull('receipt_confirmed_at')->update(['receipt_confirmed_at' => now()]);
        if (! $n) {
            $this->fail('receipt', 'There is nothing sent to you that still needs confirming.');
        }
        $c->log('Creator confirmed they received the sweets', null, 'creator');
        MarketingMail::notifyAdmin('Sweets received: '.$c->campaign->name, "{$c->creator->name} confirmed receiving the sweets.");

        return ['confirmed' => true];
    }

    public function publicSubmit(Request $request, string $token)
    {
        $v = $request->validate([
            'content_type' => ['required', Rule::in(PublishedContent::TYPES)],
            'url' => ['required', 'string', 'max:500'],
            'title' => ['nullable', 'string', 'max:160'],
            'summary' => ['nullable', 'string', 'max:1000'],
            'published_on' => ['nullable', 'date', 'before_or_equal:today'],
            'usage_permission' => ['nullable', 'boolean'],
        ]);
        $c = $this->byToken($token);
        if (! in_array($c->status, ['approved', 'content_submitted'], true)) {
            $this->fail('url', $c->status === 'invited' || $c->status === 'accepted'
                ? 'You can add your links once we have confirmed the collaboration.'
                : 'This collaboration is not accepting new links.');
        }
        $url = $this->link(SocialUrl::platformOfContent($v['content_type']) ?? 'other', $v['url'], 'url');
        if (PublishedContent::where('url', $url)->exists()) {
            $this->fail('url', 'This link has already been submitted.');
        }

        $perm = (bool) ($v['usage_permission'] ?? false);
        $item = PublishedContent::create([
            'creator_id' => $c->creator_id, 'campaign_id' => $c->campaign_id, 'collaboration_id' => $c->id,
            'content_type' => $v['content_type'], 'url' => $url, 'title' => $v['title'] ?? null, 'summary' => $v['summary'] ?? null,
            'published_on' => $v['published_on'] ?? null, 'approval_status' => 'pending', 'submitted_by' => 'creator',
            'usage_permission' => $perm, 'permission_at' => $perm ? now() : null,
            'permission_note' => $perm ? 'Given by the creator when submitting the link' : null,
        ]);
        if ($c->status === 'approved') {
            $c->update(['status' => 'content_submitted']);
        }
        $c->log('Creator submitted a link', str_replace('_', ' ', $v['content_type']), 'creator');
        MarketingMail::notifyAdmin('Content submitted: '.$c->campaign->name, "{$c->creator->name} submitted a link for review. Open Admin > Marketing & Creators > Published Reviews.");

        return response()->json(['message' => 'Thank you! We have your link and will review it.', 'id' => $item->id], 201);
    }
}
