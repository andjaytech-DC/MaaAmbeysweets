<?php

namespace App\Services;

use InvalidArgumentException;

/**
 * Checks an uploaded picture by its real content (never the client's file name or MIME type), then
 * re-encodes it. Re-encoding strips anything hidden in the file (scripts, odd headers, GPS data).
 * Uses only PHP's GD extension, so it works without extra packages.
 */
class ImageProcessor
{
    public const ALLOWED = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

    /** Longest side kept for the main copy. */
    public const MAX_MAIN = 2000;

    /**
     * @return array{format:string, ext:string, width:int, height:int, mime:string, files:array<string,string>}
     *         files: suffix ("" for the main copy, "-480", "-960") => encoded bytes
     *
     * @throws InvalidArgumentException with a message that is safe to show to the shop owner
     */
    public static function process(string $binary, int $maxBytes, array $variantWidths = [480, 960], int $minSide = 200): array
    {
        if ($binary === '') {
            throw new InvalidArgumentException('The file is empty.');
        }
        if (strlen($binary) > $maxBytes) {
            throw new InvalidArgumentException('This image is too large. The limit is '.round($maxBytes / 1048576, 1).' MB.');
        }

        $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($binary);
        if (! isset(self::ALLOWED[$mime])) {
            throw new InvalidArgumentException('Only JPG, PNG or WebP images are allowed.');
        }

        $info = @getimagesizefromstring($binary);
        if (! $info || $info[0] < 1 || $info[1] < 1) {
            throw new InvalidArgumentException('This file is not a valid image.');
        }
        [$w, $h] = $info;
        if ($w < $minSide || $h < $minSide) {
            throw new InvalidArgumentException("This image is too small. It must be at least {$minSide} pixels on each side.");
        }
        if ($w > 8000 || $h > 8000 || $w * $h > 40_000_000) {
            throw new InvalidArgumentException('This image has too many pixels. Please resize it to under 8000 pixels on the longest side.');
        }

        $src = @imagecreatefromstring($binary);
        if (! $src) {
            throw new InvalidArgumentException('This image could not be read. Try saving it again as JPG or PNG.');
        }

        if ($mime === 'image/jpeg') {
            $src = self::orient($src, $binary);
        }

        $hasAlpha = $mime !== 'image/jpeg';
        $webp = function_exists('imagewebp');
        $format = $webp ? 'webp' : ($hasAlpha ? 'png' : 'jpeg');
        $ext = $webp ? 'webp' : ($hasAlpha ? 'png' : 'jpg');

        $sw = imagesx($src);
        $sh = imagesy($src);
        $mainW = min($sw, self::MAX_MAIN);
        $files = ['' => self::encode(self::scale($src, $mainW, $hasAlpha), $format)];

        foreach ($variantWidths as $vw) {
            if ($vw < $mainW) {
                $files['-'.$vw] = self::encode(self::scale($src, $vw, $hasAlpha), $format);
            }
        }
        imagedestroy($src);

        return [
            'format' => $format,
            'ext' => $ext,
            'width' => $mainW,
            'height' => (int) round($sh * $mainW / $sw),
            'mime' => $format === 'webp' ? 'image/webp' : ($format === 'png' ? 'image/png' : 'image/jpeg'),
            'files' => $files,
        ];
    }

    private static function scale($src, int $width, bool $alpha)
    {
        $sw = imagesx($src);
        $sh = imagesy($src);
        $height = max(1, (int) round($sh * $width / $sw));
        $dst = imagecreatetruecolor($width, $height);
        if ($alpha) {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            imagefill($dst, 0, 0, imagecolorallocatealpha($dst, 0, 0, 0, 127));
        }
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $width, $height, $sw, $sh);

        return $dst;
    }

    private static function encode($gd, string $format): string
    {
        ob_start();
        match ($format) {
            'webp' => imagewebp($gd, null, 82),
            'png' => imagepng($gd, null, 6),
            default => imagejpeg($gd, null, 84),
        };
        $out = (string) ob_get_clean();
        imagedestroy($gd);

        return $out;
    }

    /** Phone photos are often stored sideways with a rotation tag; apply it. */
    private static function orient($img, string $binary)
    {
        if (! function_exists('exif_read_data')) {
            return $img;
        }
        try {
            $exif = @exif_read_data('data://image/jpeg;base64,'.base64_encode($binary));
            $o = $exif['Orientation'] ?? 1;
            $angle = [3 => 180, 6 => -90, 8 => 90][$o] ?? 0;
            if ($angle) {
                $rot = imagerotate($img, $angle, 0);
                if ($rot) {
                    imagedestroy($img);

                    return $rot;
                }
            }
        } catch (\Throwable) {
        }

        return $img;
    }
}
