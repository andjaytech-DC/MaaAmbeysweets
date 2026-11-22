<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductImage;
use App\Services\MediaStore;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/** Alt text, primary picture, order and replacement for one product's pictures. Never touches the product or its orders. */
class ProductImageController extends Controller
{
    /** POST /api/admin/products/{product}/images/{image}  (alt, is_primary, image) */
    public function update(Request $request, Product $product, ProductImage $image)
    {
        $this->owned($product, $image);
        $d = $request->validate([
            'alt' => ['nullable', 'string', 'max:200'],
            'is_primary' => ['nullable', 'boolean'],
            'image' => ['nullable', 'file', 'max:'.(int) config('media.max_kb', 5120)],
        ]);

        $old = null;
        if ($request->hasFile('image')) {
            try {
                $new = MediaStore::put($request->file('image'), 'products', 200);
            } catch (InvalidArgumentException $e) {
                return response()->json(['message' => $e->getMessage(), 'errors' => ['image' => [$e->getMessage()]]], 422);
            } catch (RuntimeException $e) {
                return response()->json(['message' => $e->getMessage()], 500);
            }
            $old = [$image->path, $image->variants];
            $image->fill(['path' => $new['path'], 'variants' => $new['variants']]);
        }
        if (array_key_exists('alt', $d)) {
            $image->alt = $d['alt'] === '' ? null : $d['alt'];
        }
        $image->save();
        if ($old) {
            MediaStore::delete($old[0], $old[1]);
        }

        if ($request->boolean('is_primary')) {
            $this->makePrimary($product, $image);
        }

        return $product->images()->get();
    }

    /** POST /api/admin/products/{product}/images/reorder  {ids:[...]}  - the first one becomes the primary picture */
    public function reorder(Request $request, Product $product)
    {
        $d = $request->validate(['ids' => ['required', 'array', 'max:20'], 'ids.*' => ['integer', 'distinct']]);
        $own = $product->images()->pluck('id')->all();
        $ids = array_values(array_filter($d['ids'], fn ($id) => in_array($id, $own)));

        DB::transaction(function () use ($product, $ids) {
            foreach ($ids as $i => $id) {
                $product->images()->where('id', $id)->update(['sort_order' => $i + 1, 'is_primary' => $i === 0]);
            }
        });

        return $product->images()->get();
    }

    public function destroy(Product $product, ProductImage $image)
    {
        $this->owned($product, $image);
        MediaStore::delete($image->path, $image->variants);
        $image->delete(); // only this picture row; the product and its orders are untouched

        return $product->images()->get();
    }

    private function owned(Product $product, ProductImage $image): void
    {
        abort_unless($image->product_id === $product->id, 404);
    }

    private function makePrimary(Product $product, ProductImage $image): void
    {
        DB::transaction(function () use ($product, $image) {
            $rest = $product->images()->where('id', '!=', $image->id)->pluck('id')->all();
            $order = array_merge([$image->id], $rest);
            foreach ($order as $i => $id) {
                $product->images()->where('id', $id)->update(['sort_order' => $i + 1, 'is_primary' => $i === 0]);
            }
        });
    }
}
