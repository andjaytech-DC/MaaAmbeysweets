<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommissionRecord extends Model
{
    public const STATUSES = ['pending', 'approved', 'paid', 'void'];

    protected $guarded = ['id'];

    protected $casts = ['base_amount' => 'decimal:2', 'amount' => 'decimal:2', 'paid_at' => 'datetime'];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
