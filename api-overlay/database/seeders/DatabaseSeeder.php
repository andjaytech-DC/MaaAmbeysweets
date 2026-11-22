<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin login. Set ADMIN_PASSWORD in api/.env before seeding, and change it after first login.
        User::updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@maaambeysweets.in')],
            ['name' => 'Admin', 'role' => 'admin', 'password' => env('ADMIN_PASSWORD', 'ChangeMe123!')]
        );

        foreach (['Barfi', 'Laddu', 'Namkeen', 'Bakery', 'Gift Boxes'] as $name) {
            Category::firstOrCreate(['slug' => Str::slug($name)], ['name' => $name]);
        }

        // Sample products for testing only - delete them from the admin panel when you load real data.
        $samples = [
            ['Kaju Barfi', 'BARFI-KAJU-500', 'Barfi', 650, '500 g'],
            ['Motichoor Laddu', 'LADDU-MOTI-500', 'Laddu', 420, '500 g'],
            ['Aloo Bhujia', 'NAMK-BHUJ-250', 'Namkeen', 120, '250 g'],
        ];
        foreach ($samples as $i => [$name, $sku, $cat, $price, $unit]) {
            Product::firstOrCreate(['sku' => $sku], [
                'name' => $name,
                'category_id' => Category::where('name', $cat)->value('id'),
                'barcode' => '890000000'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
                'price' => $price,
                'unit' => $unit,
                'stock' => 25,
                'is_active' => true,
            ]);
        }
    }
}
