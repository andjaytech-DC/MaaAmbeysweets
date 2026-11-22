<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /** Customers are people who have ordered, grouped by phone number. */
    public function customers(Request $request)
    {
        $q = Order::query()
            ->selectRaw("phone, MAX(customer_name) as name, MAX(email) as email, COUNT(*) as orders_count, SUM(CASE WHEN status <> 'cancelled' THEN total ELSE 0 END) as total_spent, MAX(created_at) as last_order_at")
            ->groupBy('phone');

        if ($t = trim((string) $request->query('q', ''))) {
            $q->where(fn ($w) => $w->where('phone', 'like', '%'.Order::normalizePhone($t).'%')
                ->orWhere('customer_name', 'like', "%{$t}%"));
        }

        return $q->orderByDesc('last_order_at')->paginate(20);
    }

    public function summary(Request $request)
    {
        [$from, $to] = $this->range($request);

        $base = fn () => Order::whereBetween('created_at', [$from, $to]);
        $valid = fn () => $base()->where('status', '<>', 'cancelled');

        $validCount = $valid()->count();
        $revenue = (float) $valid()->sum('total');

        $daily = $valid()
            ->selectRaw('DATE(created_at) as d, COUNT(*) as orders, SUM(total) as revenue')
            ->groupBy('d')->orderBy('d')->get()->keyBy('d');
        $series = [];
        for ($day = $from->copy(); $day->lte($to); $day->addDay()) {
            $k = $day->toDateString();
            $series[] = ['date' => $k, 'orders' => (int) ($daily[$k]->orders ?? 0), 'revenue' => (float) ($daily[$k]->revenue ?? 0)];
        }

        $top = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereBetween('orders.created_at', [$from, $to])
            ->where('orders.status', '<>', 'cancelled')
            ->selectRaw('order_items.name as name, SUM(order_items.qty) as qty, SUM(order_items.line_total) as revenue')
            ->groupBy('order_items.name')->orderByDesc('qty')->limit(10)->get();

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'orders' => $base()->count(),
            'cancelled' => $base()->where('status', 'cancelled')->count(),
            'revenue' => $revenue,
            'average_order' => $validCount ? round($revenue / $validCount, 2) : 0,
            'discounts' => (float) $valid()->sum('discount'),
            'by_status' => $base()->select('status', DB::raw('COUNT(*) as c'))->groupBy('status')->pluck('c', 'status'),
            'by_fulfilment' => $valid()->select('fulfilment', DB::raw('COUNT(*) as c'))->groupBy('fulfilment')->pluck('c', 'fulfilment'),
            'daily' => $series,
            'top_products' => $top,
            'expiring' => Batch::with('product:id,name,sku')
                ->where('quantity_left', '>', 0)
                ->whereDate('expires_on', '<=', now()->addDays(config('shop.expiry_warning_days'))->toDateString())
                ->orderBy('expires_on')->limit(30)->get()
                ->map(fn ($b) => ['batch_id' => $b->id, 'product' => $b->product?->name, 'sku' => $b->product?->sku, 'batch_no' => $b->batch_no,
                    'expires_on' => $b->expires_on->format('Y-m-d'), 'quantity_left' => $b->quantity_left, 'expired' => $b->expires_on->isPast() && ! $b->expires_on->isToday()]),
            'low_stock' => Product::where('is_active', true)->where('stock', '<=', 5)->orderBy('stock')->limit(20)->get(['id', 'name', 'sku', 'stock']),
        ];
    }

    public function exportOrders(Request $request)
    {
        [$from, $to] = $this->range($request);
        $file = 'orders_'.$from->toDateString().'_to_'.$to->toDateString().'.csv';

        return response()->streamDownload(function () use ($from, $to) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['number', 'date', 'status', 'customer', 'phone', 'fulfilment', 'city', 'pincode', 'subtotal', 'coupon', 'discount', 'delivery_fee', 'total', 'payment', 'items']);
            Order::with('items')->whereBetween('created_at', [$from, $to])->orderBy('id')->chunk(200, function ($orders) use ($out) {
                foreach ($orders as $o) {
                    fputcsv($out, array_map([$this, 'safe'], [
                        $o->number, $o->created_at->format('Y-m-d H:i'), $o->status, $o->customer_name, $o->phone,
                        $o->fulfilment, $o->city, $o->pincode, $o->subtotal, $o->coupon_code, $o->discount, $o->delivery_fee, $o->total,
                        $o->payment_method.'/'.$o->payment_status,
                        $o->items->map(fn ($i) => "{$i->qty} x {$i->name}".($i->option_label ? " ({$i->option_label})" : ''))->implode('; '),
                    ]));
                }
            });
            fclose($out);
        }, $file, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** Stops spreadsheet formula injection from customer-typed text. */
    private function safe($v)
    {
        $v = (string) $v;

        return $v !== '' && in_array($v[0], ['=', '+', '-', '@'], true) ? "'".$v : $v;
    }

    private function range(Request $request): array
    {
        $data = $request->validate(['from' => ['nullable', 'date'], 'to' => ['nullable', 'date', 'after_or_equal:from']]);
        $to = isset($data['to']) ? Carbon::parse($data['to'])->endOfDay() : now()->endOfDay();
        $from = isset($data['from']) ? Carbon::parse($data['from'])->startOfDay() : $to->copy()->subDays(29)->startOfDay();

        if ($from->diffInDays($to) > 366) {
            $from = $to->copy()->subDays(366)->startOfDay();
        }

        return [$from, $to];
    }
}
