<?php

namespace App\Http\Controllers;

use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ReviewController extends Controller
{
    public function index(int $id)
    {
        Product::where('is_active', true)->findOrFail($id);
        $q = Review::with(['user:id,name', 'photos'])->where('product_id', $id)->where('status', 'approved');

        return [
            'average' => round((float) (clone $q)->avg('rating'), 1),
            'count' => (clone $q)->count(),
            'reviews' => $q->orderByDesc('id')->limit(50)->get()->map(fn ($r) => [
                'name' => $this->shortName($r->user->name),
                'rating' => $r->rating,
                'comment' => $r->comment,
                'photos' => $r->photos->pluck('url'),
                'created_at' => $r->created_at,
            ]),
        ];
    }

    public function store(Request $request, int $id)
    {
        $product = Product::where('is_active', true)->findOrFail($id);
        $user = $request->user();
        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1000'],
            'photos' => ['nullable', 'array', 'max:3'],
            'photos.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ], ['photos.max' => 'You can add up to 3 photos.', 'photos.*.image' => 'Photos must be JPG, PNG or WebP.', 'photos.*.max' => 'Each photo must be under 4 MB.', 'rating.required' => 'Choose a star rating.', 'rating.between' => 'Choose a rating from 1 to 5.']);

        // Only customers who received this sweet can review it.
        $bought = OrderItem::where('product_id', $product->id)
            ->whereHas('order', fn ($q) => $q->where('user_id', $user->id)->where('status', 'delivered'))->exists();
        if (! $bought) {
            throw ValidationException::withMessages(['rating' => 'Only customers who have received this sweet can review it.']);
        }

        $review = Review::updateOrCreate(
            ['product_id' => $product->id, 'user_id' => $user->id],
            ['rating' => $data['rating'], 'comment' => $data['comment'] ?? null, 'status' => 'pending']
        );

        // A new submission replaces the photos of an earlier one.
        if ($request->hasFile('photos')) {
            foreach ($review->photos as $old) {
                Storage::disk('public')->delete($old->path);
            }
            $review->photos()->delete();
            foreach ($request->file('photos') as $file) {
                $review->photos()->create(['path' => $file->store('reviews', 'public')]);
            }
        }

        return response()->json(['message' => 'Thank you. Your review will appear after we check it.'], 201);
    }

    // ----- admin -----

    public function adminIndex(Request $request)
    {
        $q = Review::with(['user:id,name,email', 'product:id,name', 'photos'])->orderByDesc('id');
        if ($s = $request->query('status')) {
            $q->where('status', $s);
        }

        return $q->paginate(20);
    }

    public function updateStatus(Request $request, Review $review)
    {
        $data = $request->validate(['status' => ['required', 'in:pending,approved,hidden']]);
        $review->update($data);

        return $review;
    }

    private function shortName(string $name): string
    {
        $p = preg_split('/\s+/', trim($name));

        return count($p) > 1 ? $p[0].' '.mb_substr(end($p), 0, 1).'.' : $p[0];
    }
}
