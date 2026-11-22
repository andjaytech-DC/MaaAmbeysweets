<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Enquiry extends Model
{
    protected $fillable = [
        'reference', 'name', 'phone', 'email', 'occasion', 'items_text', 'quantity_text',
        'needed_by', 'fulfilment', 'city', 'notes', 'contact_via', 'status',
    ];

    protected $casts = ['needed_by' => 'date:Y-m-d'];
}
