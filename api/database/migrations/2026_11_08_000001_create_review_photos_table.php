<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('review_photos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('review_id')->constrained()->cascadeOnDelete();
            $t->string('path');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('review_photos');
    }
};
