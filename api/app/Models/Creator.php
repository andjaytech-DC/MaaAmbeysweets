<?php

namespace App\Models;

use App\Models\Concerns\HasImage;
use Illuminate\Database\Eloquent\Model;

class Creator extends Model
{
    use HasImage;

    public const TYPES = ['food_blogger', 'youtube_creator', 'instagram_influencer', 'facebook_creator', 'local_food_influencer', 'food_photographer', 'regional_content_creator'];

    public const STATUSES = ['new', 'contacted', 'interested', 'negotiating', 'approved', 'active', 'completed', 'rejected'];

    protected $guarded = ['id'];

    protected $casts = ['photo_variants' => 'array', 'proposed_price' => 'decimal:2'];

    protected $hidden = ['photo_path', 'photo_variants'];

    protected $appends = ['photo_url', 'instagram_url', 'youtube_url', 'facebook_url', 'other_profiles'];

    public function profiles()
    {
        return $this->hasMany(CreatorProfile::class);
    }

    public function collaborations()
    {
        return $this->hasMany(Collaboration::class);
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->imageUrlOf('photo');
    }

    private function profileUrl(string $platform): ?string
    {
        return $this->profiles->firstWhere('platform', $platform)?->url;
    }

    public function getInstagramUrlAttribute(): ?string
    {
        return $this->profileUrl('instagram');
    }

    public function getYoutubeUrlAttribute(): ?string
    {
        return $this->profileUrl('youtube');
    }

    public function getFacebookUrlAttribute(): ?string
    {
        return $this->profileUrl('facebook');
    }

    public function getOtherProfilesAttribute(): array
    {
        return $this->profiles->where('platform', 'other')->pluck('url')->values()->all();
    }

    /** Replace the creator's social profiles. Null leaves a platform untouched; '' / [] removes it. */
    public function syncProfiles(array $byPlatform): void
    {
        foreach (['instagram', 'youtube', 'facebook'] as $p) {
            if (! array_key_exists($p, $byPlatform)) {
                continue;
            }
            $this->profiles()->where('platform', $p)->delete();
            if ($byPlatform[$p]) {
                $this->profiles()->create(['platform' => $p, 'url' => $byPlatform[$p]]);
            }
        }
        if (array_key_exists('other', $byPlatform)) {
            $this->profiles()->where('platform', 'other')->delete();
            foreach (array_unique((array) $byPlatform['other']) as $u) {
                $this->profiles()->firstOrCreate(['url' => $u], ['platform' => 'other']);
            }
        }
        $this->unsetRelation('profiles');
    }
}
