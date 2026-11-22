<?php

namespace App\Http\Controllers\Marketing;

use App\Models\Campaign;
use App\Models\Collaboration;
use App\Models\Creator;
use App\Services\ImageField;
use App\Services\MarketingMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CampaignController extends MarketingController
{
    public function index()
    {
        return Campaign::withCount(['collaborations', 'products'])->orderByDesc('id')->limit(300)->get();
    }

    public function show(Campaign $campaign)
    {
        $campaign->load(['products:id,name,sku,price', 'collaborations.creator:id,name,city,status,email', 'collaborations.events']);
        $campaign->collaborations->each(fn ($c) => $c->setAttribute('link', MarketingMail::collabLink($c->token)));

        return $campaign;
    }

    public function store(Request $request)
    {
        [$row, $products] = $this->data($request, true);
        $c = new Campaign($row);
        $this->picture(fn () => ImageField::apply($c, 'image', $request, 'media/campaigns', 300));
        $c->save();
        if ($products !== null) {
            $c->products()->sync($products);
        }

        return response()->json($c->fresh(['products:id,name,sku,price']), 201);
    }

    public function update(Request $request, Campaign $campaign)
    {
        [$row, $products] = $this->data($request, false);
        $campaign->fill($row);
        $old = $this->picture(fn () => ImageField::apply($campaign, 'image', $request, 'media/campaigns', 300));
        $campaign->save();
        ImageField::cleanup($old);
        if ($products !== null) {
            $campaign->products()->sync($products);
        }

        return $campaign->fresh(['products:id,name,sku,price']);
    }

    public function destroy(Campaign $campaign)
    {
        if ($campaign->collaborations()->exists()) {
            $this->fail('campaign', 'This campaign has invited creators, so it is kept. Set its status to Cancelled instead.');
        }
        ImageField::cleanup([$campaign->image_path, $campaign->image_variants]);
        $campaign->delete();

        return response()->noContent();
    }

    /** POST /campaigns/{campaign}/invite  {creator_ids:[..], compensation_type, agreed_fee} */
    public function invite(Request $request, Campaign $campaign)
    {
        $v = $request->validate([
            'creator_ids' => ['required', 'array', 'min:1', 'max:50'],
            'creator_ids.*' => ['integer', 'distinct', 'exists:creators,id'],
            'compensation_type' => ['nullable', Rule::in(['gifted', 'paid', 'affiliate'])],
            'agreed_fee' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
        ]);
        if (! in_array($campaign->status, ['open', 'recruiting', 'active'], true)) {
            $this->fail('campaign', 'Set the campaign to Open, Recruiting or Active before inviting creators.');
        }
        $type = $v['compensation_type'] ?? 'gifted';
        $fee = $type === 'paid' ? ($v['agreed_fee'] ?? null) : null;
        if ($type === 'paid' && ! $fee) {
            $this->fail('agreed_fee', 'Enter the agreed fee for a paid collaboration.');
        }

        $results = [];
        foreach (Creator::whereIn('id', $v['creator_ids'])->get() as $creator) {
            if ($creator->status === 'rejected') {
                $results[] = ['creator_id' => $creator->id, 'name' => $creator->name, 'invited' => false, 'reason' => 'This creator is marked Rejected.'];

                continue;
            }
            if (Collaboration::where('campaign_id', $campaign->id)->where('creator_id', $creator->id)->exists()) {
                $results[] = ['creator_id' => $creator->id, 'name' => $creator->name, 'invited' => false, 'reason' => 'Already invited to this campaign.'];

                continue;
            }
            $collab = DB::transaction(function () use ($campaign, $creator, $type, $fee) {
                $c = Collaboration::create([
                    'campaign_id' => $campaign->id, 'creator_id' => $creator->id, 'status' => 'invited', 'token' => Str::random(48),
                    'compensation_type' => $type, 'agreed_fee' => $fee, 'payment_status' => $type === 'paid' ? 'pending' : 'not_applicable',
                    'invited_at' => now(),
                ]);
                $c->log('Invitation created', $type === 'paid' ? 'Paid collaboration' : ($type === 'affiliate' ? 'Affiliate collaboration' : 'Gifted sweets'));

                return $c;
            });
            if ($creator->status === 'new') {
                $creator->update(['status' => 'contacted']);
            }
            $link = MarketingMail::collabLink($collab->token);
            $terms = match ($type) {
                'paid' => 'This is a paid collaboration.',
                'affiliate' => 'You would receive a personal discount code, and may earn a commission on orders that use it.',
                default => 'We would send you sweets to try. You are free to share your honest opinion.',
            };
            $sent = MarketingMail::send($creator->email, 'Invitation: '.$campaign->name, "Hello {$creator->name},\n\nWe would love you to join our campaign \"{$campaign->name}\".\n\n".strip_tags((string) $campaign->description)."\n\n{$terms}\nPlease note: if you post about us, the post should say it is a gifted, paid or affiliate collaboration.\n\nSee the details and reply here:\n{$link}");
            $collab->log($sent ? 'Invitation emailed' : 'Invitation not emailed', $sent ? null : 'No email on file or email is not configured: share the link yourself.', 'system');
            $results[] = ['creator_id' => $creator->id, 'name' => $creator->name, 'invited' => true, 'collaboration_id' => $collab->id, 'email_sent' => $sent, 'link' => $link];
        }

        return ['results' => $results];
    }

    private function data(Request $request, bool $creating): array
    {
        $req = $creating ? 'required' : 'sometimes';
        $v = $request->validate([
            'name' => [$req, 'string', 'max:160'],
            'type' => [$req, Rule::in(Campaign::TYPES)],
            'description' => ['nullable', 'string', 'max:4000'],
            'objective' => ['nullable', 'string', 'max:1000'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'budget' => ['nullable', 'numeric', 'min:0', 'max:100000000'],
            'target_region' => ['nullable', 'string', 'max:120'],
            'target_audience' => ['nullable', 'string', 'max:200'],
            'creator_categories' => ['nullable', 'array', 'max:20'],
            'creator_categories.*' => ['string', 'max:60'],
            'platforms' => ['nullable', 'array', 'max:10'],
            'platforms.*' => [Rule::in(Campaign::PLATFORMS)],
            'language' => ['nullable', 'string', 'max:60'],
            'status' => ['nullable', Rule::in(Campaign::STATUSES)],
            'product_ids' => ['nullable', 'array', 'max:100'],
            'product_ids.*' => ['integer', 'exists:products,id'],
            'image' => ['nullable', 'file', 'max:'.(int) config('media.max_kb', 5120)],
        ]);
        foreach (['platforms', 'creator_categories'] as $k) {   // an empty multi-select is sent as a marker, not as an empty list
            if (! array_key_exists($k, $v) && $request->has($k.'_present')) {
                $v[$k] = [];
            }
        }
        $products = array_key_exists('product_ids', $v) ? array_values(array_unique($v['product_ids'] ?? [])) : ($request->has('product_ids_present') ? [] : null);
        unset($v['product_ids'], $v['image']);
        foreach (['name', 'type', 'status'] as $k) {
            if (array_key_exists($k, $v) && $v[$k] === null) {
                unset($v[$k]);
            }
        }

        return [$v, $products];
    }
}
