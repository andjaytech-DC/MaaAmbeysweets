<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketingSetting extends Model
{
    public $timestamps = false;

    public $incrementing = false;

    protected $primaryKey = 'key';

    protected $keyType = 'string';

    protected $guarded = [];

    public const DEFAULTS = [
        'applications_open' => '1',
        'notify_email' => '',
        'reminder_after_days' => '7',
        'disclosure_text' => 'Some creators featured here received free sweets or were paid to share their honest opinion. This is always shown next to their content.',
    ];

    public static function all_(): array
    {
        $out = self::DEFAULTS;
        try {
            foreach (static::query()->get() as $row) {
                $out[$row->key] = (string) $row->value;
            }
        } catch (\Throwable) {
            // table not created yet: defaults
        }

        return $out;
    }

    public static function get(string $key): string
    {
        return self::all_()[$key] ?? '';
    }
}
