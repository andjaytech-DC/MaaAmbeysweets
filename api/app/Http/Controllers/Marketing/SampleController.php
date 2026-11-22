<?php

namespace App\Http\Controllers\Marketing;

use App\Models\Collaboration;
use App\Models\Product;
use App\Models\ProductSample;
use App\Services\MarketingMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Sample packages and their shipments. Stock levels and orders are never touched here, and nothing is ever marked
 * delivered or reviewed automatically: those are entered by the admin (or confirmed by the creator).
 */
class SampleController extends MarketingController
{
    private const NEEDS_ITEMS = ['approved', 'preparing', 'dispatched', 'delivered', 'review_pending', 'review_submitted', 'completed'];

    private const NEEDS_DISPATCH = ['dispatched', 'delivered', 'review_pending', 'review_submitted', 'completed'];

    private const NEEDS_DELIVERY = ['delivered', 'review_pending', 'review_submitted', 'completed'];

    public function index(Request $request)
    {
        $q = ProductSample::with(['items', 'creator:id,name,city', 'campaign:id,name'])->orderByDesc('id');
        foreach (['campaign_id', 'creator_id'] as $k) {
            if ($request->filled($k)) {
                $q->where($k, (int) $request->query($k));
            }
        }
        if ($request->filled('status') && in_array($request->query('status'), ProductSample::STATUSES, true)) {
            $q->where('status', $request->query('status'));
        }

        return $q->limit(500)->get();
    }

    public function show(ProductSample $sample)
    {
        return $sample->load(['items', 'creator', 'campaign:id,name']);
    }

    public function store(Request $request)
    {
        $v = $this->validated($request, true);

        return response()->json($this->save(new ProductSample, $v, $request), 201);
    }

    public function update(Request $request, ProductSample $sample)
    {
        return $this->save($sample, $this->validated($request, false), $request);
    }

    public function destroy(ProductSample $sample)
    {
        if (! in_array($sample->status, ['requested', 'approved'], true)) {
            $this->fail('status', 'A sample that is already being prepared or sent is kept as a record.');
        }
        $sample->delete();

        return response()->noContent();
    }

    private function validated(Request $request, bool $creating): array
    {
        $r = $creating ? 'required' : 'sometimes';

        return $request->validate([
            'creator_id' => [$r, 'integer', 'exists:creators,id'],
            'campaign_id' => ['nullable', 'integer', 'exists:campaigns,id'],
            'collaboration_id' => ['nullable', 'integer', 'exists:collaborations,id'],
            'status' => ['nullable', Rule::in(ProductSample::STATUSES)],
            'items' => ['sometimes', 'array', 'max:40'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:500'],
            'items.*.unit_value' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'sample_value' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'shipping_charge' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'ship_name' => ['nullable', 'string', 'max:120'],
            'ship_phone' => ['nullable', 'string', 'max:30'],
            'ship_address' => ['nullable', 'string', 'max:500'],
            'ship_city' => ['nullable', 'string', 'max:80'],
            'ship_pincode' => ['nullable', 'string', 'max:10'],
            'dispatched_on' => ['nullable', 'date'],
            'courier' => ['nullable', 'string', 'max:60'],
            'tracking_no' => ['nullable', 'string', 'max:80'],
            'delivered_on' => ['nullable', 'date'],
            'receipt_confirmed' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
    }

    private function save(ProductSample $s, array $v, Request $request): ProductSample
    {
        $wasStatus = $s->status;
        $isNew = ! $s->exists;

        if (! empty($v['collaboration_id'])) {
            $col = Collaboration::find($v['collaboration_id']);
            if ((int) ($v['creator_id'] ?? $s->creator_id) !== (int) $col->creator_id) {
                $this->fail('collaboration_id', 'That collaboration belongs to a different creator.');
            }
            $v['campaign_id'] = $v['campaign_id'] ?? $col->campaign_id;
        }
        if (array_key_exists('ship_phone', $v)) {
            $v['ship_phone'] = $this->phone($v['ship_phone'], 'ship_phone');
        }

        $row = collect($v)->except(['items', 'receipt_confirmed'])->all();
        foreach (['status', 'creator_id'] as $k) {
            if (array_key_exists($k, $row) && $row[$k] === null) {
                unset($row[$k]);
            }
        }
        $s->fill($row);

        $items = $v['items'] ?? null;
        $count = $items !== null ? count($items) : ($s->exists ? $s->items()->count() : 0);
        $status = $s->status ?: 'requested';
        if (in_array($status, self::NEEDS_ITEMS, true) && $count === 0) {
            $this->fail('items', 'Add the sweets in this package first.');
        }
        if ($status === 'dispatched' && $wasStatus !== 'dispatched' && ! $s->dispatched_on) {
            $s->dispatched_on = now()->toDateString(); // the admin just chose "Dispatched"
        }
        if (in_array($status, self::NEEDS_DISPATCH, true) && ! $s->dispatched_on) {
            $this->fail('dispatched_on', 'Enter the dispatch date.');
        }
        if (in_array($status, self::NEEDS_DELIVERY, true) && ! $s->delivered_on) {
            $this->fail('delivered_on', 'Enter the delivery date. Deliveries are never marked automatically.');
        }
        if (! empty($v['receipt_confirmed']) && ! $s->receipt_confirmed_at) {
            $s->receipt_confirmed_at = now();
        }

        DB::transaction(function () use ($s, $items, $v) {
            $s->sample_value = $s->sample_value ?? 0;
            $s->save();
            if ($items !== null) {
                $s->items()->delete();
                $total = 0;
                $products = Product::whereIn('id', collect($items)->pluck('product_id'))->get()->keyBy('id');
                foreach ($items as $it) {
                    $p = $products[$it['product_id']];
                    $unit = $it['unit_value'] ?? $p->price;
                    $s->items()->create(['product_id' => $p->id, 'name' => $p->name, 'quantity' => $it['quantity'], 'unit_value' => $unit]);
                    $total += $unit * $it['quantity'];
                }
                // The value is the sum of the package unless the admin typed a different figure.
                if (! array_key_exists('sample_value', $v) || $v['sample_value'] === null) {
                    $s->update(['sample_value' => round($total, 2)]);
                }
            }
        });

        $s->load(['items', 'creator', 'campaign:id,name']);
        if ($s->collaboration_id && ($col = Collaboration::find($s->collaboration_id))) {
            if ($isNew) {
                $col->log('Sample package created', $s->items->count().' item(s)');
            }
            if ($wasStatus !== $s->status && ! $isNew) {
                $col->log('Sample: '.str_replace('_', ' ', $s->status), $s->tracking_no ? "Tracking {$s->tracking_no}" : null);
            }
        }
        if ($s->status === 'dispatched' && $wasStatus !== 'dispatched') {
            MarketingMail::send($s->creator->email, 'Your sweets are on their way', "Hello {$s->creator->name},\n\nYour sweets have been dispatched".($s->courier ? " with {$s->courier}" : '').($s->tracking_no ? " (tracking: {$s->tracking_no})" : '').".\n\nWhen they arrive, please let us know using your collaboration link.");
        }

        return $s;
    }
}
