<?php

namespace App\Http\Controllers;

use App\Http\Requests\CouponRequest;
use App\Models\Coupon;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CouponController extends Controller
{
    /** Cart preview: does this code work, and how much does it take off? */
    public function check(Request $request)
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:30'], 'subtotal' => ['required', 'numeric', 'min:0']]);
        $coupon = Coupon::findByCode($data['code']);

        if (! $coupon) {
            throw ValidationException::withMessages(['code' => 'That code is not valid.']);
        }
        if ($msg = $coupon->problem((float) $data['subtotal'])) {
            throw ValidationException::withMessages(['code' => $msg]);
        }

        return ['code' => $coupon->code, 'title' => $coupon->title, 'discount' => $coupon->discountFor((float) $data['subtotal'])];
    }

    /** Offers marked "show on website" that can be used today. */
    public function offers()
    {
        return Coupon::where('is_public', true)->orderBy('id', 'desc')->get()
            ->filter(fn (Coupon $c) => $c->problem(1e12) === null)
            ->map(fn (Coupon $c) => [
                'code' => $c->code, 'title' => $c->title, 'type' => $c->type, 'value' => $c->value,
                'min_order' => $c->min_order, 'ends_at' => $c->ends_at?->format('Y-m-d'),
            ])->values();
    }

    // ----- admin -----

    public function index()
    {
        return Coupon::orderByDesc('id')->get();
    }

    public function store(CouponRequest $request)
    {
        return response()->json(Coupon::create($this->payload($request)), 201);
    }

    public function update(CouponRequest $request, Coupon $coupon)
    {
        $coupon->update($this->payload($request));

        return $coupon->fresh();
    }

    public function destroy(Coupon $coupon)
    {
        $coupon->delete();

        return response()->noContent();
    }

    private function payload(CouponRequest $request): array
    {
        $d = $request->validated();
        $d['min_order'] = $d['min_order'] ?? 0;
        $d['is_active'] = $d['is_active'] ?? true;
        $d['is_public'] = $d['is_public'] ?? false;
        if (($d['type'] ?? null) !== 'percent') {
            $d['max_discount'] = null;
        }

        return $d;
    }
}
