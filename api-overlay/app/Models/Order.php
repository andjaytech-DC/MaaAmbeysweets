<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'number', 'user_id', 'customer_name', 'phone', 'email', 'fulfilment',
        'address_line', 'city', 'pincode', 'notes', 'subtotal', 'coupon_code', 'discount', 'delivery_fee',
        'total', 'is_gift', 'recipient_name', 'recipient_phone', 'gift_message', 'points_redeemed', 'points_discount', 'payment_method', 'payment_status', 'status',
    ];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function events()
    {
        return $this->hasMany(OrderEvent::class)->orderBy('id');
    }

    /** "+91 98765-43210" / "098765 43210" / "919876543210" -> "9876543210" */
    public static function normalizePhone(?string $raw): string
    {
        $d = preg_replace('/\D+/', '', (string) $raw);
        if (strlen($d) === 12 && str_starts_with($d, '91')) {
            $d = substr($d, 2);
        }
        if (strlen($d) === 11 && str_starts_with($d, '0')) {
            $d = substr($d, 1);
        }

        return $d;
    }
}
