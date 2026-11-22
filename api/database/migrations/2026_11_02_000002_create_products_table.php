<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('products', function (Blueprint $t) {
            $t->id();
            $t->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $t->string('name');
            $t->string('sku', 64)->unique();
            $t->string('barcode', 64)->nullable()->unique();
            $t->text('description')->nullable();
            $t->decimal('price', 10, 2);
            $t->decimal('mrp', 10, 2)->nullable();
            $t->string('unit', 50)->nullable();
            $t->unsignedInteger('stock')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
            $t->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
