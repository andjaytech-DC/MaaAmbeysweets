<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('batches', function (Blueprint $t) {
            $t->id();
            $t->foreignId('product_id')->constrained()->cascadeOnDelete();
            $t->string('batch_no', 40);
            $t->date('made_on');
            $t->date('expires_on');
            $t->unsignedInteger('quantity_made');
            $t->unsignedInteger('quantity_left');
            $t->timestamps();
            $t->unique(['product_id', 'batch_no']);
            $t->index('expires_on');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('batches');
    }
};
