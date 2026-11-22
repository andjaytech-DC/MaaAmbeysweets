<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AffiliateCode extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['commission_value' => 'decimal:2', 'commission_approved_at' => 'datetime'];

    public function coupon()
    {
        return $this->belongsTo(Coupon::class);
    }

    public function creator()
    {
        return $this->belongsTo(Creator::class);
    }

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    public function commissions()
    {
        return $this->hasMany(CommissionRecord::class);
    }
}
