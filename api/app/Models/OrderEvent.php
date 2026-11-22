<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderEvent extends Model
{
    public $timestamps = false;

    protected $fillable = ['order_id', 'status'];

    protected $casts = ['created_at' => 'datetime'];
}
