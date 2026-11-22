<?php

namespace App\Http\Controllers\Marketing;

use App\Models\Creator;
use App\Models\CreatorApplication;
use App\Models\MarketingSetting;
use App\Services\MarketingMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ApplicationController extends MarketingController
{
    public const COLLAB_TYPES = ['product_tasting', 'festival_campaign', 'gift_box', 'paid_collaboration', 'affiliate', 'open_to_anything'];

    /** Public: POST /api/creator-applications */
    public function store(Request $request)
    {
        if (MarketingSetting::get('applications_open') !== '1') {
            return response()->json(['message' => 'We are not taking creator applications right now. Please check back soon.'], 409);
        }
        // Hidden field that people never see: only bots fill it in.
        if (filled($request->input('company_site'))) {
            return response()->json(['message' => 'We could not accept this application.'], 422);
        }

        $v = $request->validate([
            'full_name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['nullable', 'email:rfc', 'max:190'],
            'phone' => ['nullable', 'string', 'max:30'],
            'city' => ['nullable', 'string', 'max:80'],
            'blog_url' => ['nullable', 'string', 'max:300'],
            'instagram_url' => ['nullable', 'string', 'max:300'],
            'youtube_url' => ['nullable', 'string', 'max:300'],
            'facebook_url' => ['nullable', 'string', 'max:300'],
            'other_links' => ['nullable', 'string', 'max:1500'],
            'collaboration_type' => ['nullable', 'in:'.implode(',', self::COLLAB_TYPES)],
            'audience_size' => ['nullable', 'integer', 'min:0', 'max:4000000000'],
            'language' => ['nullable', 'string', 'max:60'],
            'message' => ['nullable', 'string', 'max:2000'],
            'portfolio_links' => ['nullable', 'string', 'max:1500'],
        ], [
            'full_name.required' => 'Please tell us your name.',
            'email.email' => 'Enter a valid email address.',
        ]);

        $phone = $this->phone($v['phone'] ?? null);
        if (empty($v['email']) && ! $phone) {
            $this->fail('email', 'Please give us an email address or a phone number so we can reach you.');
        }

        $blog = $this->link('blog', $v['blog_url'] ?? null, 'blog_url');
        $ig = $this->link('instagram', $v['instagram_url'] ?? null, 'instagram_url');
        $yt = $this->link('youtube', $v['youtube_url'] ?? null, 'youtube_url');
        $fb = $this->link('facebook', $v['facebook_url'] ?? null, 'facebook_url');
        $other = $this->lines($v['other_links'] ?? null, 'other_links');
        $portfolio = $this->lines($v['portfolio_links'] ?? null, 'portfolio_links');
        if (! ($blog || $ig || $yt || $fb || $other || $portfolio)) {
            $this->fail('blog_url', 'Please add at least one link to your blog, social profile or sample work.');
        }

        $ipHash = hash_hmac('sha256', (string) $request->ip(), (string) config('app.key'));
        if (CreatorApplication::where('ip_hash', $ipHash)->where('created_at', '>', now()->subHour())->count() >= 5) {
            return response()->json(['message' => 'Too many applications from this connection. Please try again later.'], 429);
        }
        $dup = CreatorApplication::where('created_at', '>', now()->subDay())
            ->where(fn ($w) => $w->when(! empty($v['email']), fn ($q) => $q->orWhere('email', $v['email']))->when($phone, fn ($q) => $q->orWhere('phone', $phone)))
            ->exists();
        if ($dup) {
            $this->fail('email', 'We already received an application from you today. We will be in touch.');
        }

        $app = CreatorApplication::create([
            'full_name' => $v['full_name'], 'email' => $v['email'] ?? null, 'phone' => $phone, 'city' => $v['city'] ?? null,
            'blog_url' => $blog, 'instagram_url' => $ig, 'youtube_url' => $yt, 'facebook_url' => $fb,
            'other_links' => $other ?: null, 'collaboration_type' => $v['collaboration_type'] ?? null,
            'audience_size' => $v['audience_size'] ?? null, 'language' => $v['language'] ?? null,
            'message' => $v['message'] ?? null, 'portfolio_links' => $portfolio ? implode("\n", $portfolio) : null,
            'ip_hash' => $ipHash,
        ]);

        MarketingMail::send($app->email, 'We received your application', "Hello {$app->full_name},\n\nThank you for applying to create something sweet with Maa Ambey Sweets. We have received your application and will look at it soon. We will contact you if we would like to go ahead.");
        MarketingMail::notifyAdmin('New creator application', "{$app->full_name} applied to the creator programme. Open Admin > Marketing & Creators > Creator Applications to review it.");

        return response()->json(['message' => 'Thank you! Your application has been received.', 'reference' => 'CA-'.str_pad((string) $app->id, 5, '0', STR_PAD_LEFT)], 201);
    }

    // ----- admin -----

    public function index(Request $request)
    {
        $q = CreatorApplication::with('creator:id,name')->orderByRaw("status = 'new' desc")->orderByDesc('id');
        if ($request->filled('status') && in_array($request->query('status'), ['new', 'approved', 'rejected'], true)) {
            $q->where('status', $request->query('status'));
        }

        return $q->limit(500)->get();
    }

    /** Approving creates (or links) a creator in the directory. */
    public function approve(CreatorApplication $application)
    {
        if ($application->status === 'approved') {
            $this->fail('application', 'This application is already approved.');
        }

        $creator = DB::transaction(function () use ($application) {
            $existing = $application->email ? Creator::where('email', $application->email)->first() : null;
            $creator = $existing ?? Creator::create([
                'name' => $application->full_name, 'email' => $application->email, 'phone' => $application->phone,
                'city' => $application->city, 'blog_url' => $application->blog_url, 'language' => $application->language,
                'audience_size' => $application->audience_size,
                'audience_note' => $application->audience_size ? 'Reported by the creator on their application, '.$application->created_at->format('j M Y') : null,
                'collaboration_preferences' => trim(($application->collaboration_type ? str_replace('_', ' ', $application->collaboration_type).'. ' : '').($application->message ?? '')) ?: null,
                'status' => 'approved', 'source' => 'application', 'type' => 'food_blogger',
            ]);
            $profiles = [];
            foreach (['instagram', 'youtube', 'facebook'] as $p) {
                if ($application->{"{$p}_url"}) {
                    $profiles[$p] = $application->{"{$p}_url"};
                }
            }
            if ($application->other_links) {
                $profiles['other'] = $application->other_links;
            }
            if (! $existing) {
                $creator->syncProfiles($profiles);
            }
            $application->update(['status' => 'approved', 'creator_id' => $creator->id, 'reviewed_at' => now()]);

            return $creator;
        });

        $sent = MarketingMail::send($creator->email, 'Your creator application is approved', "Hello {$creator->name},\n\nGood news: your application to the Maa Ambey Sweets creator programme is approved. When we have a campaign that suits you, we will send an invitation with all the details.");

        return ['application' => $application->fresh('creator'), 'creator_id' => $creator->id, 'email_sent' => $sent];
    }

    public function reject(Request $request, CreatorApplication $application)
    {
        $v = $request->validate(['review_note' => ['nullable', 'string', 'max:300']]);
        if ($application->status === 'approved') {
            $this->fail('application', 'An approved application cannot be rejected. Change the creator status instead.');
        }
        $application->update(['status' => 'rejected', 'review_note' => $v['review_note'] ?? null, 'reviewed_at' => now()]);

        return $application->fresh();
    }

    public function destroy(CreatorApplication $application)
    {
        if ($application->status === 'approved') {
            $this->fail('application', 'Approved applications are kept as a record.');
        }
        $application->delete();

        return response()->noContent();
    }

    /** One link per line (or comma), each checked; at most 8. */
    private function lines(?string $raw, string $field): array
    {
        return collect(preg_split('/[\r\n,]+/', (string) $raw))->map(fn ($l) => trim($l))->filter()->take(8)
            ->map(fn ($l) => $this->link('other', $l, $field))->values()->all();
    }
}
