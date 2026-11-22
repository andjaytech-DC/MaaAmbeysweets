<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CreatorApplication extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['other_links' => 'array', 'reviewed_at' => 'datetime'];

    protected $hidden = ['ip_hash'];

    public function creator()
    {
        return $this->belongsTo(Creator::class);
    }
}
