<?php

namespace App\Http\Controllers\Marketing;

use App\Http\Controllers\Controller;
use App\Services\SocialUrl;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use RuntimeException;

/** Shared helpers for the creator-marketing controllers. */
abstract class MarketingController extends Controller
{
    /** A checked https link for the platform, or a field-level 422. Empty input gives null. */
    protected function link(?string $platform, ?string $value, string $field): ?string
    {
        try {
            return SocialUrl::normalize($platform, $value);
        } catch (InvalidArgumentException $e) {
            throw ValidationException::withMessages([$field => $e->getMessage()]);
        }
    }

    /** Runs a picture save and turns its failures into the usual 422 / 500 answers. */
    protected function picture(callable $fn, string $field = 'image')
    {
        try {
            return $fn();
        } catch (InvalidArgumentException $e) {
            throw ValidationException::withMessages([$field => $e->getMessage()]);
        } catch (RuntimeException $e) {
            throw new HttpResponseException(response()->json(['message' => $e->getMessage()], 500));
        }
    }

    protected function phone(?string $raw, string $field = 'phone'): ?string
    {
        $v = trim((string) $raw);
        if ($v === '') {
            return null;
        }
        $digits = preg_replace('/[\s().-]+/', '', $v);
        if (! preg_match('/^\+?\d{7,15}$/', $digits)) {
            throw ValidationException::withMessages([$field => 'Enter a valid phone number (digits only, with +country code if outside India).']);
        }

        return $digits;
    }

    protected function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
