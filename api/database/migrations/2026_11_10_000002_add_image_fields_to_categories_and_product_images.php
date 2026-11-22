<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Additive only: nothing existing is changed or removed.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $t) {
            $t->string('image_path')->nullable();
            $t->json('image_variants')->nullable();
            $t->string('image_alt')->nullable();
            $t->string('image_position', 20)->default('center');
            $t->boolean('is_active')->default(true);
        });

        Schema::table('product_images', function (Blueprint $t) {
            $t->string('alt')->nullable();
            $t->boolean('is_primary')->default(false);
            $t->json('variants')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $t) {
            $t->dropColumn(['image_path', 'image_variants', 'image_alt', 'image_position', 'is_active']);
        });
        Schema::table('product_images', function (Blueprint $t) {
            $t->dropColumn(['alt', 'is_primary', 'variants']);
        });
    }
};
