<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    public $timestamps = false;

    protected $fillable = ['order_id', 'product_id', 'name', 'sku', 'option_label', 'hamper_choices', 'unit_price', 'qty', 'line_total', 'batch_id'];

    protected $casts = ['hamper_choices' => 'array'];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
