<?php

namespace App\Services;

use InvalidArgumentException;

/** Turns what a person typed into a safe https link for a given platform, or says why it cannot. Never fetches the link. */
class SocialUrl
{
    private const HOSTS = [
        'instagram' => ['instagram.com', 'instagr.am'],
        'youtube' => ['youtube.com', 'youtu.be'],
        'facebook' => ['facebook.com', 'fb.com', 'fb.watch', 'fb.me'],
        'whatsapp' => ['wa.me', 'whatsapp.com'],
        'google_business' => ['google.com', 'g.page', 'goo.gl', 'maps.app.goo.gl', 'business.site'],
        'pinterest' => ['pinterest.com', 'pin.it'],
        'linkedin' => ['linkedin.com', 'lnkd.in'],
    ];

    private const HANDLE_BASE = [
        'instagram' => 'https://www.instagram.com/',
        'youtube' => 'https://www.youtube.com/',
        'facebook' => 'https://www.facebook.com/',
    ];

    public static function platformOfContent(string $type): ?string
    {
        return match (true) {
            str_starts_with($type, 'youtube') => 'youtube',
            str_starts_with($type, 'instagram') => 'instagram',
            str_starts_with($type, 'facebook') => 'facebook',
            default => null,
        };
    }

    /**
     * @param  string|null  $platform  instagram|youtube|facebook|whatsapp|google_business|pinterest|linkedin, or anything else = any website
     */
    public static function normalize(?string $platform, ?string $value): ?string
    {
        $v = trim((string) $value);
        if ($v === '') {
            return null;
        }
        if (strlen($v) > 300) {
            throw new InvalidArgumentException('That link is too long.');
        }

        // "@name" (or a bare name without dots) for the platforms where that is how people write it
        if (isset(self::HANDLE_BASE[$platform]) && preg_match('/^@?[A-Za-z0-9._-]{2,60}$/', $v) && (str_starts_with($v, '@') || ! str_contains($v, '.'))) {
            $v = self::HANDLE_BASE[$platform].($platform === 'youtube' ? '@' : '').ltrim($v, '@');
        }
        if (preg_match('#^http://#i', $v)) {
            $v = 'https://'.substr($v, 7);
        } elseif (! preg_match('#^https://#i', $v)) {
            if (preg_match('#^[a-z][a-z0-9+.-]*:#i', $v)) {
                throw new InvalidArgumentException('Only web links starting with https:// are accepted.');
            }
            $v = 'https://'.ltrim($v, '/');
        }

        $parts = parse_url($v);
        $host = strtolower($parts['host'] ?? '');
        if ($host === '' || ! str_contains($host, '.') || filter_var($host, FILTER_VALIDATE_IP) || isset($parts['user']) || isset($parts['pass'])) {
            throw new InvalidArgumentException('That does not look like a valid web link.');
        }
        if (! preg_match('/^[a-z0-9.-]+$/', $host)) {
            throw new InvalidArgumentException('That does not look like a valid web link.');
        }
        if (isset(self::HOSTS[$platform])) {
            $ok = false;
            foreach (self::HOSTS[$platform] as $h) {
                if ($host === $h || str_ends_with($host, '.'.$h)) {
                    $ok = true;
                }
            }
            if (! $ok) {
                throw new InvalidArgumentException('This must be a '.str_replace('_', ' ', $platform).' link.');
            }
        }

        return $v;
    }
}
