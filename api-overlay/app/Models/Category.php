<?php

namespace App\Models;

use App\Services\MediaStore;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = ['name', 'slug', 'image_path', 'image_variants', 'image_alt', 'image_position', 'is_active'];

    protected $casts = ['image_variants' => 'array', 'is_active' => 'boolean'];

    protected $hidden = ['image_path', 'image_variants', 'created_at', 'updated_at'];

    protected $appends = ['image_url', 'image_srcset'];

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path ? MediaStore::url($this->image_path) : null;
    }

    public function getImageSrcsetAttribute(): ?string
    {
        return $this->image_path ? MediaStore::srcset($this->image_path, $this->image_variants, null) : null;
    }
}
