<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Creator marketing. Additive only: no existing table is changed.
// Discounts reuse the existing `coupons` table and sales attribution reuses `orders.coupon_code`.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('creators', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('photo_path')->nullable();
            $t->json('photo_variants')->nullable();
            $t->string('type', 30)->default('food_blogger');
            $t->string('blog_name')->nullable();
            $t->string('blog_url', 300)->nullable();
            $t->string('email')->nullable()->index();
            $t->string('phone', 20)->nullable();
            $t->string('city', 80)->nullable();
            $t->string('state', 80)->nullable();
            $t->string('country', 80)->default('India');
            $t->string('language', 60)->nullable();
            $t->string('content_category', 80)->nullable();
            $t->unsignedBigInteger('audience_size')->nullable();   // only what the creator told us
            $t->string('audience_note', 200)->nullable();           // where that number came from
            $t->unsignedBigInteger('avg_views')->nullable();
            $t->string('engagement_note', 300)->nullable();
            $t->text('collaboration_preferences')->nullable();
            $t->decimal('proposed_price', 10, 2)->nullable();
            $t->string('status', 20)->default('new')->index();
            $t->text('internal_notes')->nullable();
            $t->string('source', 20)->default('admin');            // admin | application
            $t->timestamps();
        });

        Schema::create('creator_profiles', function (Blueprint $t) {
            $t->id();
            $t->foreignId('creator_id')->constrained()->cascadeOnDelete();
            $t->string('platform', 20);
            $t->string('url', 300);
            $t->unique(['creator_id', 'url']);
        });

        Schema::create('creator_applications', function (Blueprint $t) {
            $t->id();
            $t->string('full_name', 120);
            $t->string('email')->nullable()->index();
            $t->string('phone', 20)->nullable();
            $t->string('city', 80)->nullable();
            $t->string('blog_url', 300)->nullable();
            $t->string('instagram_url', 300)->nullable();
            $t->string('youtube_url', 300)->nullable();
            $t->string('facebook_url', 300)->nullable();
            $t->json('other_links')->nullable();
            $t->string('collaboration_type', 40)->nullable();
            $t->unsignedBigInteger('audience_size')->nullable();
            $t->string('language', 60)->nullable();
            $t->text('message')->nullable();
            $t->text('portfolio_links')->nullable();
            $t->string('status', 20)->default('new')->index();     // new | approved | rejected
            $t->foreignId('creator_id')->nullable()->constrained()->nullOnDelete();
            $t->string('review_note', 300)->nullable();
            $t->timestamp('reviewed_at')->nullable();
            $t->string('ip_hash', 64)->nullable();                 // for spam checks only; the address itself is not stored
            $t->timestamps();
        });

        Schema::create('campaigns', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->text('description')->nullable();
            $t->string('image_path')->nullable();
            $t->json('image_variants')->nullable();
            $t->string('type', 40);
            $t->text('objective')->nullable();
            $t->date('starts_at')->nullable();
            $t->date('ends_at')->nullable();
            $t->decimal('budget', 12, 2)->nullable();
            $t->string('target_region', 120)->nullable();
            $t->string('target_audience', 200)->nullable();
            $t->json('creator_categories')->nullable();
            $t->json('platforms')->nullable();
            $t->string('language', 60)->nullable();
            $t->string('status', 20)->default('draft')->index();
            $t->timestamps();
        });

        Schema::create('campaign_products', function (Blueprint $t) {
            $t->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $t->foreignId('product_id')->constrained()->cascadeOnDelete();
            $t->primary(['campaign_id', 'product_id']);
        });

        // One row per creator per campaign. An invitation is a collaboration whose status is "invited".
        Schema::create('collaborations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $t->foreignId('creator_id')->constrained()->cascadeOnDelete();
            $t->string('status', 24)->default('invited')->index();
            $t->string('token', 64)->unique();                     // private link the creator uses to reply and submit links
            $t->string('compensation_type', 12)->default('gifted'); // gifted | paid | affiliate
            $t->decimal('agreed_fee', 10, 2)->nullable();
            $t->string('payment_status', 14)->default('not_applicable'); // not_applicable | pending | paid
            $t->timestamp('paid_at')->nullable();
            $t->timestamp('invited_at')->nullable();
            $t->timestamp('responded_at')->nullable();
            $t->timestamp('approved_at')->nullable();
            $t->timestamp('completed_at')->nullable();
            $t->timestamp('reminder_sent_at')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->unique(['campaign_id', 'creator_id']);
        });

        Schema::create('collaboration_events', function (Blueprint $t) {
            $t->id();
            $t->foreignId('collaboration_id')->constrained()->cascadeOnDelete();
            $t->string('label', 80);
            $t->string('note', 300)->nullable();
            $t->string('actor', 10)->default('admin');             // admin | creator | system
            $t->timestamp('created_at')->useCurrent();
        });

        // A sample package and its shipment (courier, tracking, delivery) are one record.
        Schema::create('product_samples', function (Blueprint $t) {
            $t->id();
            $t->foreignId('creator_id')->constrained()->cascadeOnDelete();
            $t->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('collaboration_id')->nullable()->constrained()->nullOnDelete();
            $t->string('status', 20)->default('requested')->index();
            $t->decimal('sample_value', 10, 2)->default(0);
            $t->decimal('shipping_charge', 10, 2)->default(0);
            $t->string('ship_name', 120)->nullable();
            $t->string('ship_phone', 20)->nullable();
            $t->text('ship_address')->nullable();
            $t->string('ship_city', 80)->nullable();
            $t->string('ship_pincode', 10)->nullable();
            $t->date('dispatched_on')->nullable();
            $t->string('courier', 60)->nullable();
            $t->string('tracking_no', 80)->nullable();
            $t->date('delivered_on')->nullable();                  // set only by the admin
            $t->timestamp('receipt_confirmed_at')->nullable();     // set only when the creator (or admin on their behalf) confirms
            $t->text('notes')->nullable();
            $t->timestamps();
        });

        Schema::create('sample_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('product_sample_id')->constrained()->cascadeOnDelete();
            $t->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $t->string('name');
            $t->unsignedSmallInteger('quantity')->default(1);
            $t->decimal('unit_value', 10, 2)->default(0);
        });

        Schema::create('published_contents', function (Blueprint $t) {
            $t->id();
            $t->foreignId('creator_id')->constrained()->cascadeOnDelete();
            $t->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('collaboration_id')->nullable()->constrained()->nullOnDelete();
            $t->string('content_type', 24);
            $t->string('url', 500);
            $t->date('published_on')->nullable();
            $t->string('title')->nullable();
            $t->text('summary')->nullable();
            $t->string('thumbnail_path')->nullable();
            $t->json('thumbnail_variants')->nullable();
            $t->string('approval_status', 12)->default('pending')->index(); // pending | approved | rejected
            $t->boolean('usage_permission')->default(false);
            $t->string('permission_note', 300)->nullable();
            $t->timestamp('permission_at')->nullable();
            $t->boolean('is_featured')->default(false);
            $t->unsignedInteger('featured_order')->default(0);
            $t->unsignedBigInteger('views')->nullable();
            $t->unsignedBigInteger('likes')->nullable();
            $t->unsignedBigInteger('comments')->nullable();
            $t->unsignedBigInteger('shares')->nullable();
            $t->unsignedBigInteger('clicks')->nullable();
            $t->string('metrics_source', 20)->nullable();         // verified | creator_reported | estimated
            $t->string('metrics_note', 300)->nullable();
            $t->string('submitted_by', 10)->default('admin');      // admin | creator
            $t->timestamps();
        });

        Schema::create('content_products', function (Blueprint $t) {
            $t->foreignId('published_content_id')->constrained()->cascadeOnDelete();
            $t->foreignId('product_id')->constrained()->cascadeOnDelete();
            $t->primary(['published_content_id', 'product_id']);
        });

        Schema::create('social_channels', function (Blueprint $t) {
            $t->id();
            $t->string('platform', 24);
            $t->string('account_name', 120);
            $t->string('display_name', 120)->nullable();
            $t->string('profile_url', 300);
            $t->string('channel_url', 300)->nullable();
            $t->string('image_path')->nullable();
            $t->json('image_variants')->nullable();
            $t->string('description', 300)->nullable();
            $t->unsignedInteger('sort_order')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('affiliate_codes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('creator_id')->constrained()->cascadeOnDelete();
            $t->foreignId('coupon_id')->unique()->constrained()->restrictOnDelete(); // the real discount lives in `coupons`
            $t->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $t->string('commission_type', 10)->default('percent');   // percent | fixed (per order)
            $t->decimal('commission_value', 10, 2)->default(0);
            $t->timestamp('commission_approved_at')->nullable();     // nothing accrues until an admin approves the rule
            $t->unsignedBigInteger('commission_approved_by')->nullable();
            $t->string('notes', 300)->nullable();
            $t->timestamps();
        });

        Schema::create('commission_records', function (Blueprint $t) {
            $t->id();
            $t->foreignId('affiliate_code_id')->constrained()->cascadeOnDelete();
            $t->foreignId('order_id')->constrained()->cascadeOnDelete();
            $t->decimal('base_amount', 10, 2);
            $t->decimal('amount', 10, 2);
            $t->string('status', 10)->default('pending');            // pending | approved | paid | void
            $t->timestamp('paid_at')->nullable();
            $t->timestamps();
            $t->unique(['affiliate_code_id', 'order_id']);
        });

        Schema::create('marketing_expenses', function (Blueprint $t) {
            $t->id();
            $t->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('creator_id')->nullable()->constrained()->nullOnDelete();
            $t->string('kind', 20);                                  // sampling | shipping | paid_collab | other
            $t->decimal('amount', 10, 2);
            $t->date('spent_on')->nullable();
            $t->string('note', 300)->nullable();
            $t->timestamps();
        });

        Schema::create('marketing_settings', function (Blueprint $t) {
            $t->string('key', 60)->primary();
            $t->text('value')->nullable();
        });

        Schema::create('marketing_clicks', function (Blueprint $t) {
            $t->id();
            $t->foreignId('affiliate_code_id')->constrained()->cascadeOnDelete();
            $t->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        foreach (['marketing_clicks', 'marketing_settings', 'marketing_expenses', 'commission_records', 'affiliate_codes', 'social_channels', 'content_products', 'published_contents', 'sample_items', 'product_samples', 'collaboration_events', 'collaborations', 'campaign_products', 'campaigns', 'creator_applications', 'creator_profiles', 'creators'] as $tbl) {
            Schema::dropIfExists($tbl);
        }
    }
};
