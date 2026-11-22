<?php

namespace App\Http\Controllers;

use App\Http\Requests\OrderRequest;
use App\Models\Batch;
use App\Models\Coupon;
use App\Models\LoyaltyEntry;
use App\Models\Order;
use App\Models\Product;
use App\Services\Notifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    /** Delivery rules, so the website shows the same numbers the server charges. */
    public function config()
    {
        return config('shop');
    }

    public function store(OrderRequest $request)
    {
        $data = $request->validated();
        $user = $request->user('sanctum'); // null for guests

        $order = DB::transaction(function () use ($data, $user) {
            $lines = [];
            $subtotal = 0;

            // Prices always come from the database, never from the browser.
            foreach ($data['items'] as $i => $item) {
                $product = Product::lockForUpdate()->find($item['product_id']);

                if (! $product || ! $product->is_active) {
                    throw ValidationException::withMessages(["items.$i.product_id" => 'A product in your cart is no longer available.']);
                }

                // Gift box: the customer picks which sweets go inside. Box price is fixed; each chosen sweet's stock is reduced.
                $choices = null;
                if ($product->hamper_capacity) {
                    $picked = array_values($item['choices'] ?? []);
                    if (count($picked) !== (int) $product->hamper_capacity) {
                        throw ValidationException::withMessages(["items.$i.choices" => "Choose exactly {$product->hamper_capacity} sweets for {$product->name}."]);
                    }
                    $need = array_count_values($picked);
                    $choices = [];
                    foreach ($need as $sweetId => $per) {
                        $sweet = Product::lockForUpdate()->find($sweetId);
                        if (! $sweet || ! $sweet->is_active || ! $sweet->hamper_eligible) {
                            throw ValidationException::withMessages(["items.$i.choices" => 'One of the sweets you chose is not available for gift boxes.']);
                        }
                        $total = $per * (int) $item['qty'];
                        if ($sweet->stock < $total) {
                            throw ValidationException::withMessages(["items.$i.choices" => "Not enough {$sweet->name} left for that many boxes."]);
                        }
                        $sweet->decrement('stock', $total);
                        $choices[] = ['product_id' => $sweet->id, 'name' => $sweet->name, 'count' => $per];
                    }
                } elseif (! empty($item['choices'])) {
                    throw ValidationException::withMessages(["items.$i.choices" => 'This product is not a gift box.']);
                }

                $label = $item['option'] ?? null;
                $options = $product->weight_options ?: [];
                if ($options) {
                    $match = collect($options)->firstWhere('label', $label);
                    if (! $match) {
                        throw ValidationException::withMessages(["items.$i.option" => "Choose a weight for {$product->name}."]);
                    }
                    $unit = (float) $match['price'];
                } else {
                    $label = null;
                    $unit = (float) $product->price;
                }

                $qty = (int) $item['qty'];
                if ($product->stock < $qty) {
                    $msg = $product->stock > 0
                        ? "Only {$product->stock} of {$product->name} left."
                        : "{$product->name} is out of stock.";
                    throw ValidationException::withMessages(["items.$i.qty" => $msg]);
                }

                $product->decrement('stock', $qty);

                // Fill from the earliest-expiring good batch that can cover the whole line (for recalls and freshness).
                $batch = Batch::where('product_id', $product->id)
                    ->where('quantity_left', '>=', $qty)
                    ->whereDate('expires_on', '>=', now()->toDateString())
                    ->orderBy('expires_on')->lockForUpdate()->first();
                $batch?->decrement('quantity_left', $qty);

                $line = round($unit * $qty, 2);
                $subtotal += $line;
                $lines[] = [
                    'product_id' => $product->id, 'name' => $product->name, 'sku' => $product->sku,
                    'option_label' => $label, 'hamper_choices' => $choices, 'unit_price' => $unit, 'qty' => $qty, 'line_total' => $line,
                    'batch_id' => $batch?->id,
                ];
            }

            if ($subtotal < config('shop.min_order')) {
                throw ValidationException::withMessages(['items' => 'Minimum order is ₹'.config('shop.min_order').'.']);
            }

            // Coupon: always re-checked here, never trusted from the browser.
            $discount = 0.0;
            $couponCode = null;
            if (! empty($data['coupon'])) {
                $coupon = Coupon::where('code', strtoupper(trim($data['coupon'])))->lockForUpdate()->first();
                if (! $coupon) {
                    throw ValidationException::withMessages(['coupon' => 'That code is not valid.']);
                }
                if ($msg = $coupon->problem($subtotal)) {
                    throw ValidationException::withMessages(['coupon' => $msg]);
                }
                $discount = $coupon->discountFor($subtotal);
                $coupon->increment('used_count');
                $couponCode = $coupon->code;
            }

            // Loyalty points (logged-in customers only), re-checked on the server.
            $pointsUsed = 0;
            $pointsDiscount = 0.0;
            $want = (int) ($data['use_points'] ?? 0);
            if ($want > 0) {
                if (! $user) {
                    throw ValidationException::withMessages(['use_points' => 'Log in to use your points.']);
                }
                if ($want < config('shop.min_redeem')) {
                    throw ValidationException::withMessages(['use_points' => 'You need to use at least '.config('shop.min_redeem').' points at a time.']);
                }
                if ($want > $user->pointsBalance()) {
                    throw ValidationException::withMessages(['use_points' => 'You do not have that many points.']);
                }
                $value = round($want * (float) config('shop.point_value'), 2);
                $cap = round(($subtotal - $discount) * config('shop.max_redeem_percent') / 100, 2);
                if ($value > $cap) {
                    throw ValidationException::withMessages(['use_points' => 'You can use points worth up to ₹'.number_format($cap, 0).' on this order.']);
                }
                $pointsUsed = $want;
                $pointsDiscount = $value;
            }

            $fee = 0.0;
            if ($data['fulfilment'] === 'delivery' && $subtotal < config('shop.free_delivery_above')) {
                $fee = (float) config('shop.delivery_fee');
            }

            $order = Order::create([
                'number' => $this->makeNumber(),
                'user_id' => $user?->id,
                'customer_name' => $data['customer_name'],
                'phone' => $data['phone'],
                'email' => $data['email'] ?? null,
                'fulfilment' => $data['fulfilment'],
                'address_line' => $data['address_line'] ?? null,
                'city' => $data['city'] ?? null,
                'pincode' => $data['pincode'] ?? null,
                'notes' => $data['notes'] ?? null,
                'subtotal' => $subtotal,
                'coupon_code' => $couponCode,
                'discount' => $discount,
                'delivery_fee' => $fee,
                'total' => $subtotal - $discount - $pointsDiscount + $fee,
                'is_gift' => (bool) ($data['is_gift'] ?? false),
                'recipient_name' => $data['recipient_name'] ?? null,
                'recipient_phone' => $data['recipient_phone'] ?? null,
                'gift_message' => $data['gift_message'] ?? null,
                'points_redeemed' => $pointsUsed,
                'points_discount' => $pointsDiscount,
                'payment_method' => 'cod',
                'payment_status' => 'pending',
                'status' => 'received',
            ]);
            $order->items()->createMany($lines);
            $order->events()->create(['status' => 'received']);
            if ($pointsUsed > 0) {
                LoyaltyEntry::create(['user_id' => $user->id, 'order_id' => $order->id, 'type' => 'redeem', 'points' => -$pointsUsed]);
            }

            return $order;
        });

        Notifier::orderStatus($order);

        return response()->json($this->present($order), 201);
    }

    /** Guest tracking: order number + phone used on the order. */
    public function track(Request $request)
    {
        $data = $request->validate([
            'number' => ['required', 'string', 'max:24'],
            'phone' => ['required', 'string', 'max:20'],
        ]);

        $order = Order::where('number', strtoupper(trim($data['number'])))
            ->where('phone', Order::normalizePhone($data['phone']))
            ->first();

        if (! $order) {
            throw ValidationException::withMessages(['number' => 'No order found with that number and phone. Check both and try again.']);
        }

        return $this->present($order);
    }

    public function mine(Request $request)
    {
        return Order::with(['items', 'events'])
            ->where('user_id', $request->user()->id)
            ->orderByDesc('id')
            ->paginate(10)
            ->through(fn ($o) => $this->present($o, false));
    }

    // ----- admin -----

    public function adminIndex(Request $request)
    {
        $q = Order::with(['items', 'events'])->orderByDesc('id');
        if ($s = $request->query('status')) {
            $q->where('status', $s);
        }
        if ($t = trim((string) $request->query('q', ''))) {
            $q->where(fn ($w) => $w->where('number', 'like', "%{$t}%")
                ->orWhere('customer_name', 'like', "%{$t}%")
                ->orWhere('phone', 'like', '%'.Order::normalizePhone($t).'%'));
        }

        return $q->paginate(20)->through(fn ($o) => $this->present($o, false));
    }

    public function updateStatus(Request $request, Order $order)
    {
        $data = $request->validate(['status' => ['required', 'in:'.implode(',', config('shop.statuses'))]]);

        $changed = $order->status !== $data['status'];
        if ($changed) {
            DB::transaction(function () use ($order, $data) {
                // cancelling puts the stock back
                if ($data['status'] === 'cancelled' && $order->status !== 'cancelled') {
                    foreach ($order->items as $item) {
                        if ($item->product_id) {
                            Product::where('id', $item->product_id)->increment('stock', $item->qty);
                        }
                        foreach ($item->hamper_choices ?? [] as $c) {
                            Product::where('id', $c['product_id'])->increment('stock', $c['count'] * $item->qty);
                        }
                    }
                }
                if ($data['status'] === 'cancelled' && $order->status !== 'cancelled') {
                    // put batch stock back, give points back, take earned points away
                    foreach ($order->items as $item) {
                        if ($item->batch_id) {
                            Batch::where('id', $item->batch_id)->increment('quantity_left', $item->qty);
                        }
                    }
                    if ($order->user_id) {
                        $this->reversePoints($order);
                    }
                }
                if ($data['status'] === 'delivered' && $order->user_id) {
                    $this->earnPoints($order);
                }
                if ($data['status'] === 'cancelled' && $order->status !== 'cancelled' && $order->coupon_code) {
                    Coupon::where('code', $order->coupon_code)->where('used_count', '>', 0)->decrement('used_count');
                }
                $order->update(['status' => $data['status']]);
                $order->events()->create(['status' => $data['status']]);
            });
        }

        $order = $order->fresh();
        if ($changed) {
            Notifier::orderStatus($order);
        }

        return $this->present($order);
    }

    // ----- loyalty -----

    private function earnPoints(Order $order): void
    {
        $base = (float) $order->subtotal - (float) $order->discount - (float) $order->points_discount;
        $points = (int) floor(max(0, $base) * (float) config('shop.points_per_rupee'));
        if ($points > 0) {
            // unique(order_id, type) makes this safe to repeat
            LoyaltyEntry::firstOrCreate(['order_id' => $order->id, 'type' => 'earn'], ['user_id' => $order->user_id, 'points' => $points]);
        }
    }

    private function reversePoints(Order $order): void
    {
        $earn = LoyaltyEntry::where('order_id', $order->id)->where('type', 'earn')->first();
        if ($earn) {
            LoyaltyEntry::firstOrCreate(['order_id' => $order->id, 'type' => 'reverse_earn'], ['user_id' => $order->user_id, 'points' => -$earn->points]);
        }
        $redeem = LoyaltyEntry::where('order_id', $order->id)->where('type', 'redeem')->first();
        if ($redeem) {
            LoyaltyEntry::firstOrCreate(['order_id' => $order->id, 'type' => 'reverse_redeem'], ['user_id' => $order->user_id, 'points' => -$redeem->points]);
        }
    }

    // ----- helpers -----

    private function present(Order $order, bool $withDetails = true): array
    {
        $order->loadMissing(['items', 'events']);

        return [
            'id' => $order->id,
            'number' => $order->number,
            'status' => $order->status,
            'customer_name' => $order->customer_name,
            'phone' => $order->phone,
            'email' => $order->email,
            'fulfilment' => $order->fulfilment,
            'address_line' => $order->address_line,
            'city' => $order->city,
            'pincode' => $order->pincode,
            'notes' => $order->notes,
            'subtotal' => $order->subtotal,
            'coupon_code' => $order->coupon_code,
            'discount' => $order->discount,
            'points_redeemed' => $order->points_redeemed,
            'points_discount' => $order->points_discount,
            'is_gift' => (bool) $order->is_gift,
            'recipient_name' => $order->recipient_name,
            'recipient_phone' => $order->recipient_phone,
            'gift_message' => $order->gift_message,
            'delivery_fee' => $order->delivery_fee,
            'total' => $order->total,
            'payment_method' => $order->payment_method,
            'payment_status' => $order->payment_status,
            'created_at' => $order->created_at,
            'items' => $order->items->map(fn ($i) => [
                'product_id' => $i->product_id, 'name' => $i->name, 'option_label' => $i->option_label, 'hamper_choices' => $i->hamper_choices,
                'unit_price' => $i->unit_price, 'qty' => $i->qty, 'line_total' => $i->line_total,
            ]),
            'events' => $order->events->map(fn ($e) => ['status' => $e->status, 'at' => $e->created_at]),
        ];
    }

    private function makeNumber(): string
    {
        do {
            $n = 'MAS'.now()->format('ymd').random_int(1000, 9999);
        } while (Order::where('number', $n)->exists());

        return $n;
    }
}
