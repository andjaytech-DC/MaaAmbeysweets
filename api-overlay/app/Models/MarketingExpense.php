<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketingExpense extends Model
{
    public const KINDS = ['sampling', 'shipping', 'paid_collab', 'other'];

    protected $guarded = ['id'];

    protected $casts = ['amount' => 'decimal:2', 'spent_on' => 'date:Y-m-d'];
}
