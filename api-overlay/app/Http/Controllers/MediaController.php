<?php

namespace App\Http\Controllers;

use App\Models\SiteMedia;
use App\Services\MediaStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use InvalidArgumentException;
use RuntimeException;

/**
 * Website photography managed from the admin: hero slides, banners, festival gallery and brand assets.
 * One table (site_media) and one set of endpoints, selected by `kind`.
 */
class MediaController extends Controller
{
    private const KINDS = ['hero', 'banner', 'gallery', 'brand'];

    private const SLOTS = ['logo', 'footer_logo', 'mobile_logo', 'favicon', 'promo'];

    /** Smallest accepted side, per kind. */
    private const MIN_SIDE = ['hero' => 600, 'banner' => 300, 'gallery' => 300, 'brand' => 32];

    // ---------- Public ----------

    /** GET /api/site-media?kind=hero  - only published, switched-on items inside their dates. */
    public function publicIndex(Request $request): JsonResponse
    {
        $kind = $request->validate(['kind' => ['required', Rule::in(self::KINDS)]])['kind'];

        $items = SiteMedia::where('kind', $kind)->live()->orderBy('sort_order')->orderBy('id')->get();

        return response()->json($items)->header('Cache-Control', 'public, max-age=30');
    }

    // ---------- Admin ----------

    /** GET /api/admin/media?kind=hero  - everything, including drafts and switched-off items. */
    public function adminIndex(Request $request)
    {
        $kind = $request->validate(['kind' => ['required', Rule::in(self::KINDS)]])['kind'];

        return SiteMedia::where('kind', $kind)->orderBy('sort_order')->orderBy('id')->get();
    }

    /** POST /api/admin/media  (multipart: kind, image or images[], plus the text fields) */
    public function store(Request $request)
    {
        $kind = $request->validate(['kind' => ['required', Rule::in(self::KINDS)]])['kind'];

        $data = $request->validate($this->rules($kind, true));
        $files = $request->file('images', []);
        if ($request->hasFile('image')) {
            $files = [$request->file('image')];
        }
        if (! $files) {
            return response()->json(['message' => 'Choose a picture to upload.', 'errors' => ['image' => ['Choose a picture to upload.']]], 422);
        }
        if ($kind !== 'gallery' && count($files) > 1) {
            return response()->json(['message' => 'Upload one picture at a time here.', 'errors' => ['image' => ['Upload one picture at a time here.']]], 422);
        }

        $fields = $this->fields($data);
        $created = [];
        $order = (int) SiteMedia::where('kind', $kind)->max('sort_order');

        foreach ($files as $file) {
            try {
                $img = $this->save($file, $kind);
                $mobile = $request->hasFile('mobile_image') && count($files) === 1
                    ? MediaStore::put($request->file('mobile_image'), "media/{$kind}", self::MIN_SIDE[$kind])
                    : null;
            } catch (InvalidArgumentException $e) {
                return $this->fail($created, $e->getMessage(), 422);
            } catch (RuntimeException $e) {
                return $this->fail($created, $e->getMessage(), 500);
            }

            $created[] = SiteMedia::create($fields + [
                'kind' => $kind,
                'disk' => MediaStore::diskName(),
                'path' => $img['path'],
                'variants' => $img['variants'],
                'original_name' => $img['name'],
                'mime' => $img['mime'],
                'width' => $img['width'],
                'height' => $img['height'],
                'size_bytes' => $img['size'],
                'mobile_path' => $mobile['path'] ?? null,
                'mobile_variants' => $mobile['variants'] ?? null,
                'mobile_width' => $mobile['width'] ?? null,
                'sort_order' => ++$order,
            ]);
        }

        // A brand slot (logo, favicon...) holds one picture, except promotional images.
        if ($kind === 'brand' && ($fields['group'] ?? null) && $fields['group'] !== 'promo') {
            SiteMedia::where('kind', 'brand')->where('group', $fields['group'])->whereNotIn('id', collect($created)->pluck('id'))->get()->each(fn ($old) => $this->remove($old));
        }

        return response()->json(count($created) === 1 ? $created[0] : $created, 201);
    }

    /** POST /api/admin/media/{media}  (multipart so a replacement picture can come with it) */
    public function update(Request $request, SiteMedia $media)
    {
        $data = $request->validate($this->rules($media->kind, false));
        $media->fill($this->fields($data));

        $old = [];
        try {
            if ($request->hasFile('image')) {
                $img = $this->save($request->file('image'), $media->kind);
                $old[] = [$media->path, $media->variants];
                $media->fill(['path' => $img['path'], 'variants' => $img['variants'], 'original_name' => $img['name'], 'mime' => $img['mime'], 'width' => $img['width'], 'height' => $img['height'], 'size_bytes' => $img['size']]);
            }
            if ($request->hasFile('mobile_image')) {
                $m = MediaStore::put($request->file('mobile_image'), "media/{$media->kind}", self::MIN_SIDE[$media->kind]);
                $old[] = [$media->mobile_path, $media->mobile_variants];
                $media->fill(['mobile_path' => $m['path'], 'mobile_variants' => $m['variants'], 'mobile_width' => $m['width']]);
            } elseif ($request->boolean('remove_mobile_image') && $media->mobile_path) {
                $old[] = [$media->mobile_path, $media->mobile_variants];
                $media->fill(['mobile_path' => null, 'mobile_variants' => null, 'mobile_width' => null]);
            }
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage(), 'errors' => ['image' => [$e->getMessage()]]], 422);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }

        $media->save();
        // Remove the replaced files only after the new ones are saved.
        foreach ($old as [$path, $variants]) {
            MediaStore::delete($path, $variants);
        }

        return $media->fresh();
    }

    public function destroy(SiteMedia $media)
    {
        $this->remove($media);

        return response()->noContent();
    }

    /** POST /api/admin/media/reorder  {kind, ids:[3,1,2]} */
    public function reorder(Request $request)
    {
        $d = $request->validate([
            'kind' => ['required', Rule::in(self::KINDS)],
            'ids' => ['required', 'array', 'max:200'],
            'ids.*' => ['integer', 'distinct'],
        ]);
        $valid = SiteMedia::where('kind', $d['kind'])->whereIn('id', $d['ids'])->pluck('id')->all();

        DB::transaction(function () use ($d, $valid) {
            foreach (array_values(array_filter($d['ids'], fn ($id) => in_array($id, $valid))) as $i => $id) {
                SiteMedia::where('id', $id)->update(['sort_order' => $i + 1]);
            }
        });

        return SiteMedia::where('kind', $d['kind'])->orderBy('sort_order')->orderBy('id')->get();
    }

    /** POST /api/admin/media/publish  {kind, status: published|draft, ids?: []}  - ids omitted = every item of that kind */
    public function publish(Request $request)
    {
        $d = $request->validate([
            'kind' => ['required', Rule::in(self::KINDS)],
            'status' => ['required', Rule::in(['published', 'draft'])],
            'ids' => ['nullable', 'array', 'max:200'],
            'ids.*' => ['integer'],
        ]);
        $q = SiteMedia::where('kind', $d['kind']);
        if (! empty($d['ids'])) {
            $q->whereIn('id', $d['ids']);
        }
        $q->update(['status' => $d['status']]);

        return SiteMedia::where('kind', $d['kind'])->orderBy('sort_order')->orderBy('id')->get();
    }

    // ---------- Helpers ----------

    private function rules(string $kind, bool $creating): array
    {
        $url = 'regex:/^(\/(?!\/)[^\s]*|https:\/\/[^\s]+)$/'; // a path on this site, or an https link

        return [
            'title' => ['nullable', 'string', 'max:120'],
            'subtitle' => ['nullable', 'string', 'max:200'],
            'caption' => ['nullable', 'string', 'max:300'],
            'alt' => ['nullable', 'string', 'max:200'],
            'cta_text' => ['nullable', 'string', 'max:40'],
            'cta_url' => ['nullable', 'string', 'max:300', $url],
            'position' => ['nullable', Rule::in(['center', 'top', 'bottom', 'left', 'right'])],
            'duration_ms' => ['nullable', 'integer', 'min:2000', 'max:20000'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active' => ['nullable', 'boolean'],
            'status' => ['nullable', Rule::in(['draft', 'published'])],
            'group' => $kind === 'brand'
                ? [$creating ? 'required' : 'nullable', Rule::in(self::SLOTS)]
                : ['nullable', 'string', 'max:60'],
            // Real validation of the picture itself happens in ImageProcessor; these just stop obviously wrong uploads early.
            // Hero slides may also be a video, so their limit is the larger of the two (checked precisely when saving).
            'image' => ['nullable', 'file', 'max:'.$this->uploadLimit($kind)],
            'images' => ['nullable', 'array', 'max:20'],
            'images.*' => ['file', 'max:'.$this->uploadLimit($kind)],
            'mobile_image' => ['nullable', 'file', 'max:'.(int) config('media.max_kb', 5120)],
        ];
    }

    private function uploadLimit(string $kind): int
    {
        $img = (int) config('media.max_kb', 5120);

        return $kind === 'hero' ? max($img, (int) config('media.video_max_kb', 30720)) : $img;
    }

    /** Saves a picture, or (hero slides only) a video, chosen by looking inside the file. */
    private function save(\Illuminate\Http\UploadedFile $file, string $kind): array
    {
        if (MediaStore::isVideo($file)) {
            if ($kind !== 'hero') {
                throw new InvalidArgumentException('Videos can only be used for homepage hero slides.');
            }

            return MediaStore::putVideo($file, "media/{$kind}");
        }

        return MediaStore::put($file, "media/{$kind}", self::MIN_SIDE[$kind]);
    }

    private function fields(array $data): array
    {
        $out = collect($data)->only(['title', 'subtitle', 'caption', 'alt', 'cta_text', 'cta_url', 'position', 'duration_ms', 'starts_at', 'ends_at', 'is_active', 'status', 'group'])->all();
        // an empty text box means "clear it"
        foreach (['title', 'subtitle', 'caption', 'alt', 'cta_text', 'cta_url', 'starts_at', 'ends_at'] as $k) {
            if (array_key_exists($k, $out) && $out[$k] === '') {
                $out[$k] = null;
            }
        }
        foreach (['position', 'duration_ms', 'is_active', 'status'] as $k) {
            if (array_key_exists($k, $out) && $out[$k] === null) {
                unset($out[$k]);
            }
        }

        return $out;
    }

    private function remove(SiteMedia $m): void
    {
        MediaStore::delete($m->path, $m->variants);
        MediaStore::delete($m->mobile_path, $m->mobile_variants);
        $m->delete();
    }

    /** Undo the pictures already saved in this request, then report the problem. */
    private function fail(array $created, string $message, int $status): JsonResponse
    {
        foreach ($created as $m) {
            $this->remove($m);
        }

        return response()->json(['message' => $message, 'errors' => ['image' => [$message]]], $status);
    }
}
