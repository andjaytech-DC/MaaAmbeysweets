<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Services\MediaStore;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use InvalidArgumentException;
use RuntimeException;

class CategoryController extends Controller
{
    /** Public: only categories that are switched on. */
    public function index()
    {
        $q = Category::query();
        // Until the image migration has been run the column does not exist; show every category rather than none.
        if (Schema::hasColumn('categories', 'is_active')) {
            $q->where('is_active', true);
        }

        return $q->orderBy('name')->get();
    }

    /** Admin: all categories, including switched-off ones. */
    public function adminIndex()
    {
        return Category::orderBy('name')->get();
    }

    /** POST /api/admin/categories/{category}  (multipart: image, remove_image, image_alt, image_position, is_active) */
    public function update(Request $request, Category $category)
    {
        $d = $request->validate([
            'image_alt' => ['nullable', 'string', 'max:200'],
            'image_position' => ['nullable', Rule::in(['center', 'top', 'bottom', 'left', 'right'])],
            'is_active' => ['nullable', 'boolean'],
            'image' => ['nullable', 'file', 'max:'.(int) config('media.max_kb', 5120)],
        ]);

        if (array_key_exists('image_alt', $d)) {
            $category->image_alt = $d['image_alt'] === '' ? null : $d['image_alt'];
        }
        if (! empty($d['image_position'])) {
            $category->image_position = $d['image_position'];
        }
        if ($request->has('is_active')) {
            $category->is_active = $request->boolean('is_active');
        }

        $old = null;
        if ($request->hasFile('image')) {
            try {
                $img = MediaStore::put($request->file('image'), 'media/categories', 300);
            } catch (InvalidArgumentException $e) {
                return response()->json(['message' => $e->getMessage(), 'errors' => ['image' => [$e->getMessage()]]], 422);
            } catch (RuntimeException $e) {
                return response()->json(['message' => $e->getMessage()], 500);
            }
            $old = [$category->image_path, $category->image_variants];
            $category->image_path = $img['path'];
            $category->image_variants = $img['variants'];
        } elseif ($request->boolean('remove_image') && $category->image_path) {
            $old = [$category->image_path, $category->image_variants];
            $category->image_path = null;
            $category->image_variants = null;
        }

        $category->save();
        if ($old) {
            MediaStore::delete($old[0], $old[1]);
        }

        return $category->fresh();
    }
}
