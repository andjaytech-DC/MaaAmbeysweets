<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Batch extends Model
{
    protected $fillable = ['product_id', 'batch_no', 'made_on', 'expires_on', 'quantity_made', 'quantity_left'];

    protected $casts = ['made_on' => 'date:Y-m-d', 'expires_on' => 'date:Y-m-d'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
