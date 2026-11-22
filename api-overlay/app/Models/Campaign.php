<?php

namespace App\Models;

use App\Models\Concerns\HasImage;
use Illuminate\Database\Eloquent\Model;

class Campaign extends Model
{
    use HasImage;

    public const TYPES = ['product_tasting_review', 'festival_promotion', 'wedding_gifting', 'corporate_gifting', 'local_food_blogger', 'instagram_reels', 'youtube_review', 'blog_article', 'paid_collaboration', 'affiliate_promotion'];

    public const STATUSES = ['draft', 'open', 'recruiting', 'active', 'completed', 'cancelled'];

    public const PLATFORMS = ['instagram', 'youtube', 'facebook', 'blog', 'other'];

    protected $guarded = ['id'];

    protected $casts = [
        'image_variants' => 'array', 'creator_categories' => 'array', 'platforms' => 'array',
        'starts_at' => 'date:Y-m-d', 'ends_at' => 'date:Y-m-d', 'budget' => 'decimal:2',
    ];

    protected $hidden = ['image_path', 'image_variants'];

    protected $appends = ['image_url'];

    public function products()
    {
        return $this->belongsToMany(Product::class, 'campaign_products');
    }

    public function collaborations()
    {
        return $this->hasMany(Collaboration::class);
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->imageUrlOf('image');
    }
}
