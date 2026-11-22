<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $t) {
            $t->unsignedTinyInteger('hamper_capacity')->nullable()->after('weight_options'); // set = this is a gift box holding N sweets
            $t->boolean('hamper_eligible')->default(false)->after('hamper_capacity');          // can be chosen to go in a box
        });
        Schema::table('order_items', function (Blueprint $t) {
            $t->json('hamper_choices')->nullable()->after('option_label');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', fn (Blueprint $t) => $t->dropColumn('hamper_choices'));
        Schema::table('products', fn (Blueprint $t) => $t->dropColumn(['hamper_capacity', 'hamper_eligible']));
    }
};
