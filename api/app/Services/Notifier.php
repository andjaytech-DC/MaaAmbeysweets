<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Order messages. Never throws: a failed message must not fail an order.
 *
 * SHOP_NOTIFY_DRIVER:
 *   log     (default) writes the messages to storage/logs/laravel.log, so you can see what would be sent.
 *   webhook POSTs JSON {to, channel, message, order} to SHOP_NOTIFY_WEBHOOK_URL. Point it at a WhatsApp/SMS
 *           provider's endpoint or an automation tool (Make, n8n, Zapier) once you have chosen one.
 * Email goes out through the normal MAIL_* settings whenever the customer gave an email address
 * and the driver is not "log".
 */
class Notifier
{
    private const TEXT = [
        'received' => 'Thank you for your order {number} from {shop}. Total {total}. We will call you if we need anything.',
        'preparing' => 'Your order {number} is being freshly prepared.',
        'ready' => 'Your order {number} is ready{pickup}.',
        'dispatched' => 'Your order {number} is on its way.',
        'delivered' => 'Your order {number} was delivered. Enjoy! You can review the sweets on our website.',
        'cancelled' => 'Your order {number} was cancelled. If this is a surprise, please call us.',
    ];

    public static function orderStatus(Order $order): void
    {
        try {
            $text = self::TEXT[$order->status] ?? null;
            if (! $text) {
                return;
            }
            $msg = strtr($text, [
                '{number}' => $order->number,
                '{shop}' => config('shop.name', 'Maa Ambey Sweets'),
                '{total}' => '₹'.number_format((float) $order->total, 2),
                '{pickup}' => $order->fulfilment === 'pickup' ? ' for pickup' : '',
            ]);

            self::send($order->phone, 'whatsapp', $msg, $order);
            if ($order->is_gift && $order->recipient_phone && $order->status === 'dispatched') {
                self::send($order->recipient_phone, 'whatsapp', "A gift from {$order->customer_name} is on its way to you (order {$order->number}).", $order);
            }
            if ($order->email && config('shop.notify_driver') !== 'log') {
                Mail::raw($msg, fn ($m) => $m->to($order->email)->subject("Order {$order->number}"));
            }
            if ($order->status === 'received' && ($owner = config('shop.notify_email')) && config('shop.notify_driver') !== 'log') {
                Mail::raw("New order {$order->number} from {$order->customer_name} ({$order->phone}), total ₹{$order->total}.", fn ($m) => $m->to($owner)->subject("New order {$order->number}"));
            }
        } catch (\Throwable $e) {
            Log::warning('Notification failed: '.$e->getMessage());
        }
    }

    private static function send(string $to, string $channel, string $message, Order $order): void
    {
        if (config('shop.notify_driver') === 'webhook' && ($url = config('shop.notify_webhook_url'))) {
            Http::timeout(5)->post($url, ['to' => '91'.$to, 'channel' => $channel, 'message' => $message, 'order' => $order->number]);

            return;
        }
        Log::info("[notify:{$channel}] to {$to}: {$message}");
    }
}
