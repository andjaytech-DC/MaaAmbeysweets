<?php

namespace App\Models;

use App\Models\Concerns\HasImage;
use Illuminate\Database\Eloquent\Model;

class SocialChannel extends Model
{
    use HasImage;

    public const PLATFORMS = ['instagram', 'youtube', 'facebook', 'whatsapp', 'google_business', 'pinterest', 'linkedin', 'other'];

    protected $guarded = ['id'];

    protected $casts = ['image_variants' => 'array', 'is_active' => 'boolean'];

    protected $hidden = ['image_path', 'image_variants'];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        return $this->imageUrlOf('image');
    }
}
