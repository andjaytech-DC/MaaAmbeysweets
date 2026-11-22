<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $t) {
            $t->id();
            $t->string('code', 30)->unique();
            $t->string('title');
            $t->string('type', 10); // percent | flat
            $t->decimal('value', 10, 2);
            $t->decimal('min_order', 10, 2)->default(0);
            $t->decimal('max_discount', 10, 2)->nullable();
            $t->date('starts_at')->nullable();
            $t->date('ends_at')->nullable();
            $t->unsignedInteger('usage_limit')->nullable();
            $t->unsignedInteger('used_count')->default(0);
            $t->boolean('is_active')->default(true);
            $t->boolean('is_public')->default(false); // shown on the home page as an offer
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupons');
    }
};
