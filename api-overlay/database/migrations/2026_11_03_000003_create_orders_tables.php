<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $t) {
            $t->id();
            $t->string('number', 24)->unique();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('customer_name');
            $t->string('phone', 10)->index();
            $t->string('email')->nullable();
            $t->string('fulfilment', 10); // delivery | pickup
            $t->string('address_line')->nullable();
            $t->string('city')->nullable();
            $t->string('pincode', 6)->nullable();
            $t->text('notes')->nullable();
            $t->decimal('subtotal', 10, 2);
            $t->decimal('delivery_fee', 10, 2)->default(0);
            $t->decimal('total', 10, 2);
            $t->string('payment_method', 20)->default('cod');
            $t->string('payment_status', 20)->default('pending');
            $t->string('status', 20)->default('received')->index();
            $t->timestamps();
        });

        Schema::create('order_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained()->cascadeOnDelete();
            $t->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $t->string('name');
            $t->string('sku', 64);
            $t->string('option_label', 50)->nullable();
            $t->decimal('unit_price', 10, 2);
            $t->unsignedSmallInteger('qty');
            $t->decimal('line_total', 10, 2);
        });

        Schema::create('order_events', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained()->cascadeOnDelete();
            $t->string('status', 20);
            $t->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_events');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
