<?php

namespace App\Models;

use App\Services\MediaStore;
use Illuminate\Database\Eloquent\Model;

class SiteMedia extends Model
{
    protected $table = 'site_media';

    protected $fillable = [
        'kind', 'group', 'disk', 'path', 'mobile_path', 'variants', 'mobile_variants', 'original_name', 'mime', 'width', 'height',
        'size_bytes', 'mobile_width', 'alt', 'title', 'subtitle', 'caption', 'cta_text', 'cta_url', 'position', 'duration_ms',
        'starts_at', 'ends_at', 'is_active', 'status', 'sort_order',
    ];

    protected $casts = [
        'variants' => 'array',
        'mobile_variants' => 'array',
        'is_active' => 'boolean',
        'starts_at' => 'date:Y-m-d',
        'ends_at' => 'date:Y-m-d',
    ];

    protected $hidden = ['path', 'mobile_path', 'disk', 'variants', 'mobile_variants', 'original_name'];

    protected $appends = ['url', 'srcset', 'thumb_url', 'mobile_url', 'mobile_srcset', 'is_video'];

    public function getUrlAttribute(): string
    {
        return MediaStore::url($this->path);
    }

    public function getSrcsetAttribute(): ?string
    {
        return MediaStore::srcset($this->path, $this->variants, $this->width);
    }

    public function getIsVideoAttribute(): bool
    {
        return str_starts_with((string) $this->mime, 'video/');
    }

    public function getThumbUrlAttribute(): string
    {
        // A video's cover picture (stored as the phone picture) stands in as its thumbnail.
        if ($this->is_video) {
            return $this->mobile_path ? MediaStore::url($this->mobile_path) : '';
        }
        $v = $this->variants;

        return MediaStore::url($v ? MediaStore::variantPath($this->path, min($v)) : $this->path);
    }

    public function getMobileUrlAttribute(): ?string
    {
        return $this->mobile_path ? MediaStore::url($this->mobile_path) : null;
    }

    public function getMobileSrcsetAttribute(): ?string
    {
        return $this->mobile_path ? MediaStore::srcset($this->mobile_path, $this->mobile_variants, $this->mobile_width) : null;
    }

    /** Published, switched on and inside its date window. */
    public function scopeLive($q)
    {
        $today = now()->toDateString();

        return $q->where('status', 'published')->where('is_active', true)
            ->where(fn ($w) => $w->whereNull('starts_at')->orWhere('starts_at', '<=', $today))
            ->where(fn ($w) => $w->whereNull('ends_at')->orWhere('ends_at', '>=', $today));
    }
}
