<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $t) {
            $t->string('shelf_life', 60)->nullable()->after('unit');
            $t->text('ingredients')->nullable()->after('shelf_life');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $t) {
            $t->dropColumn(['shelf_life', 'ingredients']);
        });
    }
};
