<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;

class BatchController extends Controller
{
    public function index(Product $product)
    {
        return $product->batches()->orderByDesc('expires_on')->get();
    }

    public function store(Request $request, Product $product)
    {
        $data = $request->validate([
            'batch_no' => ['required', 'string', 'max:40', 'unique:batches,batch_no,NULL,id,product_id,'.$product->id],
            'made_on' => ['required', 'date'],
            'expires_on' => ['required', 'date', 'after:made_on'],
            'quantity_made' => ['required', 'integer', 'min:1', 'max:100000'],
        ], [
            'batch_no.unique' => 'This product already has a batch with that number.',
            'expires_on.after' => 'The expiry date must be after the made-on date.',
        ]);

        return response()->json($product->batches()->create($data + ['quantity_left' => $data['quantity_made']]), 201);
    }

    public function destroy(Batch $batch)
    {
        $batch->delete();

        return response()->noContent();
    }

    /** Food-safety lookup: who received food from this batch? */
    public function orders(Batch $batch)
    {
        return Order::whereHas('items', fn ($q) => $q->where('batch_id', $batch->id))
            ->orderByDesc('id')->get(['number', 'customer_name', 'phone', 'status', 'created_at']);
    }
}
