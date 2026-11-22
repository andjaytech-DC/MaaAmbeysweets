<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductSample extends Model
{
    public const STATUSES = ['requested', 'approved', 'preparing', 'dispatched', 'delivered', 'review_pending', 'review_submitted', 'completed'];

    protected $guarded = ['id'];

    protected $casts = [
        'sample_value' => 'decimal:2', 'shipping_charge' => 'decimal:2', 'dispatched_on' => 'date:Y-m-d',
        'delivered_on' => 'date:Y-m-d', 'receipt_confirmed_at' => 'datetime',
    ];

    public function items()
    {
        return $this->hasMany(SampleItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(Creator::class);
    }

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }
}
