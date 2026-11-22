<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductRequest;
use App\Models\Category;
use App\Models\Product;
use App\Services\MediaStore;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProductController extends Controller
{
    // ---------- public ----------

    public function index(Request $request)
    {
        return $this->list($request, true);
    }

    public function show(int $id)
    {
        $p = Product::with(['category', 'images'])->where('is_active', true)->findOrFail($id);
        $p->setAttribute('batch', $p->nextBatch());

        return $p;
    }

    /** Find by SKU or barcode (used by QR / barcode scans). */
    public function lookup(string $code)
    {
        $p = Product::with(['category', 'images'])
            ->where('is_active', true)
            ->where(fn ($q) => $q->where('sku', $code)->orWhere('barcode', $code))
            ->firstOrFail();
        $p->setAttribute('batch', $p->nextBatch());

        return $p;
    }

    // ---------- admin ----------

    public function adminIndex(Request $request)
    {
        return $this->list($request, false);
    }

    public function adminShow(Product $product)
    {
        return $product->load(['category', 'images']);
    }

    public function store(ProductRequest $request)
    {
        $data = $request->safe()->only([
            'category_id', 'name', 'sku', 'barcode', 'description', 'price', 'mrp', 'unit', 'shelf_life', 'ingredients', 'weight_options', 'hamper_capacity', 'hamper_eligible', 'stock', 'is_active',
        ]);
        $data['stock'] = $data['stock'] ?? 0;
        $data['is_active'] = $data['is_active'] ?? true;

        $product = DB::transaction(function () use ($data, $request) {
            $product = Product::create($data);
            $this->saveImages($product, $request->file('images', []));

            return $product;
        });

        return response()->json($product->load(['category', 'images']), 201);
    }

    public function update(ProductRequest $request, Product $product)
    {
        $data = $request->safe()->only([
            'category_id', 'name', 'sku', 'barcode', 'description', 'price', 'mrp', 'unit', 'shelf_life', 'ingredients', 'weight_options', 'hamper_capacity', 'hamper_eligible', 'stock', 'is_active',
        ]);
        if (array_key_exists('stock', $data) && $data['stock'] === null) {
            $data['stock'] = 0;
        }

        DB::transaction(function () use ($data, $request, $product) {
            $product->update($data);

            $removeIds = $request->input('remove_image_ids', []);
            if ($removeIds) {
                $product->images()->whereIn('id', $removeIds)->get()->each(function ($img) {
                    MediaStore::delete($img->path, $img->variants);
                    $img->delete();
                });
            }

            $this->saveImages($product, $request->file('images', []));
        });

        return $product->fresh(['category', 'images']);
    }

    public function destroy(Product $product)
    {
        foreach ($product->images as $img) {
            MediaStore::delete($img->path, $img->variants);
        }
        $product->delete();

        return response()->noContent();
    }

    /**
     * CSV import. Header columns:
     * name,sku,barcode,category,price,mrp,unit,shelf_life,ingredients,stock,description,is_active
     * Rows are matched on SKU: existing SKU = update, new SKU = create.
     */
    /** CSV in the same columns the importer reads, so it can be edited and re-imported. */
    public function export()
    {
        return response()->streamDownload(function () {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['name', 'sku', 'barcode', 'category', 'price', 'mrp', 'unit', 'shelf_life', 'ingredients', 'stock', 'description', 'is_active']);
            Product::with('category:id,name')->orderBy('id')->chunk(200, function ($rows) use ($out) {
                foreach ($rows as $p) {
                    fputcsv($out, array_map(function ($v) {
                        $v = (string) $v;

                        return $v !== '' && in_array($v[0], ['=', '+', '-', '@'], true) ? "'".$v : $v;
                    }, [$p->name, $p->sku, $p->barcode, $p->category?->name, $p->price, $p->mrp, $p->unit, $p->shelf_life, $p->ingredients, $p->stock, $p->description, $p->is_active ? 1 : 0]));
                }
            });
            fclose($out);
        }, 'products.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function import(Request $request)
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:5120']]);

        $h = fopen($request->file('file')->getRealPath(), 'r');
        $head = fgetcsv($h) ?: [];
        $head = array_map(fn ($c) => strtolower(trim(preg_replace('/^\xEF\xBB\xBF/', '', (string) $c))), $head);

        $created = 0;
        $updated = 0;
        $errors = [];
        $line = 1;

        while (($row = fgetcsv($h)) !== false) {
            $line++;
            if (count(array_filter($row, fn ($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }
            $row = array_pad(array_slice($row, 0, count($head)), count($head), null);
            $d = array_map(fn ($v) => ($v = trim((string) $v)) === '' ? null : $v, array_combine($head, $row));

            $existing = ! empty($d['sku']) ? Product::where('sku', $d['sku'])->first() : null;

            $v = Validator::make($d, [
                'name' => ['required', 'string', 'max:255'],
                'sku' => ['required', 'string', 'max:64'],
                'barcode' => ['nullable', 'string', 'max:64', Rule::unique('products', 'barcode')->ignore($existing?->id)],
                'category' => ['nullable', 'string', 'max:120'],
                'price' => ['required', 'numeric', 'min:0'],
                'mrp' => ['nullable', 'numeric', 'min:0'],
                'unit' => ['nullable', 'string', 'max:50'],
                'shelf_life' => ['nullable', 'string', 'max:60'],
                'ingredients' => ['nullable', 'string', 'max:2000'],
                'stock' => ['nullable', 'integer', 'min:0'],
                'description' => ['nullable', 'string'],
                'is_active' => ['nullable', 'in:0,1,true,false,yes,no'],
            ]);

            if ($v->fails()) {
                $errors[] = ['line' => $line, 'messages' => $v->errors()->all()];
                continue;
            }

            $categoryId = null;
            if (! empty($d['category'])) {
                $categoryId = Category::firstOrCreate(
                    ['slug' => Str::slug($d['category'])],
                    ['name' => $d['category']]
                )->id;
            }

            $payload = [
                'category_id' => $categoryId,
                'name' => $d['name'],
                'barcode' => $d['barcode'] ?? null,
                'description' => $d['description'] ?? null,
                'price' => $d['price'],
                'mrp' => $d['mrp'] ?? null,
                'unit' => $d['unit'] ?? null,
                'shelf_life' => $d['shelf_life'] ?? null,
                'ingredients' => $d['ingredients'] ?? null,
                'stock' => (int) ($d['stock'] ?? 0),
                'is_active' => isset($d['is_active'])
                    ? in_array(strtolower($d['is_active']), ['1', 'true', 'yes'], true)
                    : true,
            ];

            if ($existing) {
                $existing->update($payload);
                $updated++;
            } else {
                Product::create($payload + ['sku' => $d['sku']]);
                $created++;
            }
        }
        fclose($h);

        return ['created' => $created, 'updated' => $updated, 'errors' => $errors];
    }

    // ---------- helpers ----------

    private function list(Request $request, bool $onlyActive)
    {
        $q = Product::with(['category', 'images']);

        if ($onlyActive) {
            $q->where('is_active', true);
            // gift boxes have their own builder page; ?hamper=1 lists the boxes, ?eligible=1 the sweets that can go inside
            if ($request->boolean('hamper')) {
                $q->whereNotNull('hamper_capacity');
            } elseif ($request->boolean('eligible')) {
                $q->where('hamper_eligible', true)->where('stock', '>', 0);
            } else {
                $q->whereNull('hamper_capacity');
            }
        }

        if ($s = trim((string) $request->query('q', ''))) {
            $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$s}%")
                ->orWhere('sku', 'like', "%{$s}%")
                ->orWhere('barcode', 'like', "%{$s}%"));
        }

        if ($c = $request->query('category')) {
            $q->whereHas('category', fn ($w) => $w->where('slug', $c));
        }

        $per = max(1, min((int) $request->query('per_page', 24), 100));

        return $q->orderByDesc('id')->paginate($per)->withQueryString();
    }

    private function saveImages(Product $product, array $files): void
    {
        $order = (int) $product->images()->max('sort_order');
        foreach ($files as $file) {
            try {
                $img = MediaStore::put($file, 'products', 200);
            } catch (\InvalidArgumentException $e) {
                throw ValidationException::withMessages(['images' => $e->getMessage()]);
            }
            $product->images()->create([
                'path' => $img['path'],
                'variants' => $img['variants'],
                'sort_order' => ++$order,
                'is_primary' => $order === 1,
            ]);
        }
    }
}
