<?php

namespace App\Models;

use App\Models\Concerns\HasImage;
use Illuminate\Database\Eloquent\Model;

class PublishedContent extends Model
{
    use HasImage;

    public const TYPES = ['blog_article', 'youtube_video', 'youtube_short', 'instagram_reel', 'instagram_post', 'facebook_video', 'facebook_post', 'other'];

    public const SOURCES = ['verified', 'creator_reported', 'estimated'];

    protected $guarded = ['id'];

    protected $casts = [
        'thumbnail_variants' => 'array', 'published_on' => 'date:Y-m-d', 'usage_permission' => 'boolean', 'is_featured' => 'boolean',
        'permission_at' => 'datetime',
    ];

    protected $hidden = ['thumbnail_path', 'thumbnail_variants'];

    protected $appends = ['thumbnail_url'];

    public function creator()
    {
        return $this->belongsTo(Creator::class);
    }

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    public function products()
    {
        return $this->belongsToMany(Product::class, 'content_products');
    }

    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->imageUrlOf('thumbnail');
    }
}
