<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoyaltyEntry extends Model
{
    protected $fillable = ['user_id', 'order_id', 'type', 'points'];
}
