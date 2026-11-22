<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'category_id', 'name', 'sku', 'barcode', 'description',
        'price', 'mrp', 'unit', 'shelf_life', 'ingredients', 'weight_options', 'hamper_capacity', 'hamper_eligible', 'stock', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'hamper_eligible' => 'boolean',
        'hamper_capacity' => 'integer',
        'stock' => 'integer',
        'weight_options' => 'array',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function batches()
    {
        return $this->hasMany(Batch::class);
    }

    /** The batch a new order would be filled from: earliest expiry that is still good and has stock. */
    public function nextBatch(): ?array
    {
        $b = $this->batches()->where('quantity_left', '>', 0)->whereDate('expires_on', '>=', now()->toDateString())->orderBy('expires_on')->first();

        return $b ? ['made_on' => $b->made_on->format('Y-m-d'), 'expires_on' => $b->expires_on->format('Y-m-d')] : null;
    }

    public function images()
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order')->orderBy('id');
    }
}
