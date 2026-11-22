<?php

namespace App\Models;

use App\Services\MediaStore;
use Illuminate\Database\Eloquent\Model;

class ProductImage extends Model
{
    protected $fillable = ['product_id', 'path', 'sort_order', 'alt', 'is_primary', 'variants'];

    protected $casts = ['is_primary' => 'boolean', 'variants' => 'array'];

    protected $hidden = ['path', 'variants', 'created_at', 'updated_at'];

    protected $appends = ['url', 'srcset', 'thumb_url'];

    public function getUrlAttribute(): string
    {
        return MediaStore::url($this->path);
    }

    public function getSrcsetAttribute(): ?string
    {
        return MediaStore::srcset($this->path, $this->variants, null);
    }

    public function getThumbUrlAttribute(): string
    {
        $v = $this->variants;

        return MediaStore::url($v ? MediaStore::variantPath($this->path, min($v)) : $this->path);
    }
}
