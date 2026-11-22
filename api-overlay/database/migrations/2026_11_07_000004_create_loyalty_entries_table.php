<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('loyalty_entries', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $t->string('type', 20); // earn | redeem | reverse_earn | reverse_redeem
            $t->integer('points'); // signed
            $t->timestamps();
            $t->unique(['order_id', 'type']);
            $t->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_entries');
    }
};
