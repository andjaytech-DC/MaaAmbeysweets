<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            $t->boolean('is_gift')->default(false);
            $t->string('recipient_name')->nullable();
            $t->string('recipient_phone', 10)->nullable();
            $t->string('gift_message', 300)->nullable();
            $t->unsignedInteger('points_redeemed')->default(0);
            $t->decimal('points_discount', 10, 2)->default(0);
        });
        Schema::table('order_items', function (Blueprint $t) {
            $t->foreignId('batch_id')->nullable()->constrained('batches')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $t) {
            $t->dropConstrainedForeignId('batch_id');
        });
        Schema::table('orders', function (Blueprint $t) {
            $t->dropColumn(['is_gift', 'recipient_name', 'recipient_phone', 'gift_message', 'points_redeemed', 'points_discount']);
        });
    }
};
