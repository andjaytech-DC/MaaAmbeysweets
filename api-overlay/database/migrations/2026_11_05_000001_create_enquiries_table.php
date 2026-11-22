<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('enquiries', function (Blueprint $t) {
            $t->id();
            $t->string('reference', 24)->unique();
            $t->string('name');
            $t->string('phone', 10)->index();
            $t->string('email')->nullable();
            $t->string('occasion', 20);
            $t->text('items_text');
            $t->string('quantity_text', 100);
            $t->date('needed_by')->nullable();
            $t->string('fulfilment', 10)->default('delivery');
            $t->string('city', 100)->nullable();
            $t->text('notes')->nullable();
            $t->string('contact_via', 10); // whatsapp | call | email
            $t->string('status', 20)->default('new')->index();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enquiries');
    }
};
