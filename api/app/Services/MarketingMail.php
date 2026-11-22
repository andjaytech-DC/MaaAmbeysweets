<?php

namespace App\Services;

use App\Models\MarketingSetting;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Plain-text emails through the app's normal mail configuration. A failed send never breaks the action that caused it;
 * the caller gets true/false so the admin can be told "email not sent, share the link yourself".
 * With MAIL_MAILER=log (the default) messages are written to storage/logs instead of being delivered.
 */
class MarketingMail
{
    public static function siteUrl(): string
    {
        return rtrim((string) env('FRONTEND_URL', 'http://localhost:3001'), '/');
    }

    public static function send(?string $to, string $subject, string $body): bool
    {
        if (! $to || ! filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return false;
        }
        $body .= "\n\nWarm regards,\nMaa Ambey Sweets\n".self::siteUrl();
        try {
            Mail::raw($body, fn ($m) => $m->to($to)->subject($subject));

            return true;
        } catch (\Throwable $e) {
            Log::warning('Marketing email not sent', ['subject' => $subject, 'error' => $e->getMessage()]);

            return false;
        }
    }

    /** Tell the shop owner something arrived (only if a notification address is set in Marketing settings). */
    public static function notifyAdmin(string $subject, string $body): bool
    {
        return self::send(MarketingSetting::get('notify_email') ?: null, $subject, $body);
    }

    public static function collabLink(string $token): string
    {
        return self::siteUrl().'/creator-partnership/respond/'.$token;
    }
}
