<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    protected $fillable = [
        'code', 'title', 'type', 'value', 'min_order', 'max_discount',
        'starts_at', 'ends_at', 'usage_limit', 'is_active', 'is_public',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_public' => 'boolean',
        'starts_at' => 'date:Y-m-d',
        'ends_at' => 'date:Y-m-d',
        'used_count' => 'integer',
        'usage_limit' => 'integer',
    ];

    /** Returns a customer-facing reason the code cannot be used, or null if it can. */
    public function problem(float $subtotal): ?string
    {
        $today = now()->startOfDay();

        if (! $this->is_active) {
            return 'This code is not active.';
        }
        if ($this->starts_at && $today->lt($this->starts_at->startOfDay())) {
            return 'This offer has not started yet.';
        }
        if ($this->ends_at && $today->gt($this->ends_at->startOfDay())) {
            return 'This offer has ended.';
        }
        if ($this->usage_limit !== null && $this->used_count >= $this->usage_limit) {
            return 'This offer has been fully used.';
        }
        if ($subtotal < (float) $this->min_order) {
            return 'Add ₹'.number_format((float) $this->min_order - $subtotal, 0).' more to use this code.';
        }

        return null;
    }

    public function discountFor(float $subtotal): float
    {
        $d = $this->type === 'percent' ? $subtotal * (float) $this->value / 100 : (float) $this->value;
        if ($this->type === 'percent' && $this->max_discount) {
            $d = min($d, (float) $this->max_discount);
        }

        return round(min($d, $subtotal), 2);
    }

    public static function findByCode(?string $code): ?self
    {
        $code = strtoupper(trim((string) $code));

        return $code === '' ? null : static::where('code', $code)->first();
    }
}
