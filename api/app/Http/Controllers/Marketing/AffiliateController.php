<?php

namespace App\Http\Controllers\Marketing;

use App\Models\AffiliateCode;
use App\Models\CommissionRecord;
use App\Models\Coupon;
use App\Models\Creator;
use App\Models\MarketingClick;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Creator discount codes. The discount itself is an ordinary row in `coupons`, so the existing checkout applies and
 * counts it. Sales are attributed through `orders.coupon_code`: there is no second order-tracking system.
 */
class AffiliateController extends MarketingController
{
    public function index()
    {
        $codes = AffiliateCode::with(['coupon', 'creator:id,name', 'campaign:id,name'])->orderByDesc('id')->limit(500)->get();
        $stats = $this->stats($codes->pluck('coupon.code')->filter()->all());

        return $codes->map(function (AffiliateCode $a) use ($stats) {
            $s = $stats[$a->coupon->code] ?? ['orders' => 0, 'revenue' => 0, 'net_sales' => 0];
            $comm = $a->commissions()->whereIn('status', ['pending', 'approved', 'paid'])->get();

            return $a->toArray() + [
                'orders' => $s['orders'], 'revenue' => $s['revenue'], 'net_sales' => $s['net_sales'],
                'clicks' => MarketingClick::where('affiliate_code_id', $a->id)->count(),
                'commission_pending' => (float) $comm->whereIn('status', ['pending', 'approved'])->sum('amount'),
                'commission_paid' => (float) $comm->where('status', 'paid')->sum('amount'),
            ];
        })->values();
    }

    public function store(Request $request)
    {
        $v = $this->validated($request, true);
        $creator = Creator::findOrFail($v['creator_id']);
        $code = $v['code'] ?? $this->generate($creator);

        $a = DB::transaction(function () use ($v, $code) {
            $coupon = Coupon::create([
                'code' => $code, 'title' => $v['title'] ?? 'Creator offer', 'type' => $v['type'], 'value' => $v['value'],
                'min_order' => $v['min_order'] ?? 0, 'max_discount' => $v['type'] === 'percent' ? ($v['max_discount'] ?? null) : null,
                'starts_at' => $v['starts_at'] ?? null, 'ends_at' => $v['ends_at'] ?? null, 'usage_limit' => $v['usage_limit'] ?? null,
                'is_active' => $v['is_active'] ?? true, 'is_public' => false,
            ]);

            return AffiliateCode::create([
                'creator_id' => $v['creator_id'], 'coupon_id' => $coupon->id, 'campaign_id' => $v['campaign_id'] ?? null,
                'commission_type' => $v['commission_type'] ?? 'percent', 'commission_value' => $v['commission_value'] ?? 0,
                'notes' => $v['notes'] ?? null,
            ]);
        });

        return response()->json($a->load('coupon', 'creator:id,name'), 201);
    }

    public function update(Request $request, AffiliateCode $affiliate)
    {
        $v = $this->validated($request, false, $affiliate);
        DB::transaction(function () use ($v, $affiliate) {
            $c = $affiliate->coupon;
            $c->fill(collect($v)->only(['title', 'type', 'value', 'min_order', 'max_discount', 'starts_at', 'ends_at', 'usage_limit', 'is_active'])->all());
            if (($c->type) !== 'percent') {
                $c->max_discount = null;
            }
            $c->save();

            $rule = collect($v)->only(['commission_type', 'commission_value', 'campaign_id', 'notes'])->all();
            $changed = (isset($rule['commission_type']) && $rule['commission_type'] !== $affiliate->commission_type)
                || (isset($rule['commission_value']) && (float) $rule['commission_value'] !== (float) $affiliate->commission_value);
            $affiliate->fill($rule);
            if ($changed) {
                $affiliate->commission_approved_at = null; // a changed rule must be approved again
                $affiliate->commission_approved_by = null;
            }
            $affiliate->save();
        });

        return $affiliate->fresh(['coupon', 'creator:id,name']);
    }

    /** Switches the code off (it keeps its history). A code that was never used can be deleted outright. */
    public function destroy(AffiliateCode $affiliate)
    {
        $coupon = $affiliate->coupon;
        $used = Order::where('coupon_code', $coupon->code)->exists();
        if ($used) {
            $coupon->update(['is_active' => false]);

            return response()->json(['message' => 'This code has orders, so it was switched off instead of deleted.', 'deactivated' => true]);
        }
        DB::transaction(function () use ($affiliate, $coupon) {
            $affiliate->delete();
            $coupon->delete();
        });

        return response()->noContent();
    }

    /** The administrator approves the commission rule; nothing accrues before this. */
    public function approveCommission(Request $request, AffiliateCode $affiliate)
    {
        if ((float) $affiliate->commission_value <= 0) {
            $this->fail('commission_value', 'Set a commission above zero first, or leave this code without a commission.');
        }
        $affiliate->update(['commission_approved_at' => now(), 'commission_approved_by' => $request->user()->id]);

        return $affiliate->fresh(['coupon', 'creator:id,name']);
    }

    /** Records one commission per qualifying order. Safe to run again: existing records are kept, cancelled orders are voided. */
    public function syncCommissions(AffiliateCode $affiliate)
    {
        if (! $affiliate->commission_approved_at) {
            $this->fail('commission', 'Approve the commission rule first.');
        }
        $code = $affiliate->coupon->code;
        $created = $voided = 0;
        foreach (Order::where('coupon_code', $code)->get() as $o) {
            $existing = CommissionRecord::where('affiliate_code_id', $affiliate->id)->where('order_id', $o->id)->first();
            if ($o->status === 'cancelled') {
                if ($existing && in_array($existing->status, ['pending', 'approved'], true)) {
                    $existing->update(['status' => 'void']);
                    $voided++;
                }

                continue;
            }
            if ($existing) {
                continue;
            }
            $base = max(0, (float) $o->subtotal - (float) $o->discount);
            $amount = $affiliate->commission_type === 'percent' ? round($base * (float) $affiliate->commission_value / 100, 2) : (float) $affiliate->commission_value;
            CommissionRecord::create(['affiliate_code_id' => $affiliate->id, 'order_id' => $o->id, 'base_amount' => $base, 'amount' => $amount, 'status' => 'pending']);
            $created++;
        }

        return ['created' => $created, 'voided' => $voided];
    }

    public function commissions(AffiliateCode $affiliate)
    {
        return $affiliate->commissions()->with('order:id,number,status,total,created_at')->orderByDesc('id')->get();
    }

    public function updateCommission(Request $request, CommissionRecord $commission)
    {
        $to = $request->validate(['status' => ['required', Rule::in(['pending', 'approved', 'paid', 'void'])]])['status'];
        $allowed = ['pending' => ['approved', 'void'], 'approved' => ['paid', 'pending', 'void'], 'paid' => [], 'void' => ['pending']];
        if (! in_array($to, $allowed[$commission->status], true)) {
            $this->fail('status', 'A '.$commission->status.' commission cannot be changed to '.$to.'.');
        }
        $commission->update(['status' => $to, 'paid_at' => $to === 'paid' ? now() : null]);

        return $commission->fresh('order:id,number,status,total,created_at');
    }

    /** Orders and sales per coupon code, excluding cancelled orders. */
    public static function stats(array $codes): array
    {
        if (! $codes) {
            return [];
        }
        $out = [];
        foreach (Order::whereIn('coupon_code', $codes)->where('status', '!=', 'cancelled')->selectRaw('coupon_code, count(*) as orders, sum(total) as revenue, sum(subtotal - discount) as net_sales')->groupBy('coupon_code')->get() as $r) {
            $out[$r->coupon_code] = ['orders' => (int) $r->orders, 'revenue' => round((float) $r->revenue, 2), 'net_sales' => round((float) $r->net_sales, 2)];
        }

        return $out;
    }

    private function generate(Creator $creator): string
    {
        $stem = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', Str::ascii($creator->name)), 0, 8)) ?: 'MAA';
        do {
            $code = $stem.random_int(10, 99).strtoupper(Str::random(2));
        } while (Coupon::where('code', $code)->exists());

        return $code;
    }

    private function validated(Request $request, bool $creating, ?AffiliateCode $existing = null): array
    {
        $r = $creating ? 'required' : 'sometimes';
        $v = $request->validate([
            'creator_id' => [$r, 'integer', 'exists:creators,id'],
            'campaign_id' => ['nullable', 'integer', 'exists:campaigns,id'],
            'code' => ['nullable', 'string', 'min:4', 'max:30', 'regex:/^[A-Za-z0-9]+$/'],
            'title' => ['nullable', 'string', 'max:120'],
            'type' => [$r, Rule::in(['percent', 'flat'])],
            'value' => [$r, 'numeric', 'min:0.01', 'max:100000'],
            'min_order' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'max_discount' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'usage_limit' => ['nullable', 'integer', 'min:1', 'max:1000000'],
            'is_active' => ['nullable', 'boolean'],
            'commission_type' => ['nullable', Rule::in(['percent', 'fixed'])],
            'commission_value' => ['nullable', 'numeric', 'min:0', 'max:100000'],
            'notes' => ['nullable', 'string', 'max:300'],
        ]);
        if (($v['type'] ?? $existing?->coupon->type) === 'percent' && ($v['value'] ?? $existing?->coupon->value ?? 0) > 100) {
            $this->fail('value', 'A percentage discount cannot be more than 100.');
        }
        if (($v['commission_type'] ?? null) === 'percent' && ($v['commission_value'] ?? 0) > 100) {
            $this->fail('commission_value', 'A percentage commission cannot be more than 100.');
        }
        if (! empty($v['code'])) {
            $v['code'] = strtoupper($v['code']);
            if ($creating && Coupon::where('code', $v['code'])->exists()) {
                $this->fail('code', 'That code is already in use. Leave it blank to generate one.');
            }
        }
        if (! $creating) {
            unset($v['code'], $v['creator_id']); // a code and its owner are fixed once created
        }
        foreach (['type', 'value', 'is_active'] as $k) {
            if (array_key_exists($k, $v) && $v[$k] === null) {
                unset($v[$k]);
            }
        }

        return $v;
    }

    // ---------- Public ----------

    /** POST /api/marketing/click {ref} - counts a visit that arrived with a creator's code. Stores no personal data. */
    public function click(Request $request)
    {
        $ref = strtoupper(trim((string) $request->input('ref')));
        if (! preg_match('/^[A-Z0-9]{4,30}$/', $ref)) {
            return response()->noContent();
        }
        $id = AffiliateCode::whereHas('coupon', fn ($q) => $q->where('code', $ref)->where('is_active', true))->value('id');
        if ($id) {
            MarketingClick::create(['affiliate_code_id' => $id]);
        }

        return response()->noContent();
    }
}
