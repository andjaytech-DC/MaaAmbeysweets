<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Website photography managed from the admin: hero slides, banners, festival gallery and brand assets.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_media', function (Blueprint $t) {
            $t->id();
            $t->string('kind', 20)->index();          // hero | banner | gallery | brand
            $t->string('group', 60)->nullable();      // gallery category, or brand slot (logo, footer_logo, mobile_logo, favicon, promo)
            $t->string('disk', 20)->default('public');
            $t->string('path');
            $t->string('mobile_path')->nullable();
            $t->json('variants')->nullable();         // widths of the smaller copies, e.g. [480,960]
            $t->json('mobile_variants')->nullable();
            $t->string('original_name')->nullable();
            $t->string('mime', 40)->nullable();
            $t->unsignedInteger('width')->nullable();
            $t->unsignedInteger('height')->nullable();
            $t->unsignedInteger('size_bytes')->nullable();
            $t->unsignedInteger('mobile_width')->nullable();
            $t->string('alt')->nullable();
            $t->string('title', 120)->nullable();
            $t->string('subtitle', 200)->nullable();
            $t->string('caption', 300)->nullable();
            $t->string('cta_text', 40)->nullable();
            $t->string('cta_url', 300)->nullable();
            $t->string('position', 20)->default('center'); // CSS object-position keyword
            $t->unsignedSmallInteger('duration_ms')->default(6500);
            $t->date('starts_at')->nullable();
            $t->date('ends_at')->nullable();
            $t->boolean('is_active')->default(true);
            $t->string('status', 12)->default('draft'); // draft | published
            $t->unsignedInteger('sort_order')->default(0);
            $t->timestamps();
            $t->index(['kind', 'status', 'is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_media');
    }
};
