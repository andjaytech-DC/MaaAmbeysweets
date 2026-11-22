<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class ReviewPhoto extends Model
{
    protected $fillable = ['review_id', 'path'];

    protected $hidden = ['path', 'created_at', 'updated_at'];

    protected $appends = ['url'];

    public function getUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->path);
    }
}
