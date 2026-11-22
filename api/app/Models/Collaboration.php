<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Collaboration extends Model
{
    public const STATUSES = ['invited', 'accepted', 'declined', 'approved', 'content_submitted', 'content_approved', 'completed', 'cancelled'];

    /** Where an admin may move a collaboration from each status. Replies and content submissions move it too (see the controllers). */
    public const NEXT = [
        'invited' => ['cancelled'],
        'accepted' => ['approved', 'cancelled'],
        'declined' => [],
        'approved' => ['content_submitted', 'cancelled'],
        'content_submitted' => ['content_approved', 'approved', 'cancelled'],
        'content_approved' => ['completed', 'cancelled'],
        'completed' => [],
        'cancelled' => [],
    ];

    protected $guarded = ['id'];

    protected $hidden = ['token'];

    protected $casts = [
        'agreed_fee' => 'decimal:2', 'paid_at' => 'datetime', 'invited_at' => 'datetime', 'responded_at' => 'datetime',
        'approved_at' => 'datetime', 'completed_at' => 'datetime', 'reminder_sent_at' => 'datetime',
    ];

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    public function creator()
    {
        return $this->belongsTo(Creator::class);
    }

    public function events()
    {
        return $this->hasMany(CollaborationEvent::class)->orderBy('id');
    }

    public function samples()
    {
        return $this->hasMany(ProductSample::class);
    }

    public function contents()
    {
        return $this->hasMany(PublishedContent::class);
    }

    public function log(string $label, ?string $note = null, string $actor = 'admin'): void
    {
        $this->events()->create(['label' => $label, 'note' => $note, 'actor' => $actor]);
    }
}
