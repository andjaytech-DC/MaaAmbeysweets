<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

/** Saves processed images to the configured disk using random, safe file names. */
class MediaStore
{
    public static function diskName(): string
    {
        return (string) config('media.disk', 'public');
    }

    public static function url(string $path): string
    {
        return Storage::disk(self::diskName())->url($path);
    }

    /** "media/hero/2026/11/abc.webp" + 480 => "media/hero/2026/11/abc-480.webp" */
    public static function variantPath(string $path, int $width): string
    {
        return preg_replace('/\.(\w+)$/', "-{$width}.$1", $path);
    }

    /**
     * @param  string  $dir  fixed folder chosen by the server (never from the client), e.g. "media/hero"
     * @return array{path:string,width:int,height:int,size:int,mime:string,variants:int[],name:string}
     *
     * @throws InvalidArgumentException for a bad image (safe to show)
     * @throws RuntimeException for a storage failure (safe to show)
     */
    public static function put(UploadedFile $file, string $dir, int $minSide = 200): array
    {
        if (! $file->isValid()) {
            throw new InvalidArgumentException('The upload did not finish. The file may be larger than the server allows; try a smaller image.');
        }
        $binary = @file_get_contents($file->getRealPath());
        if ($binary === false) {
            throw new RuntimeException('The uploaded file could not be read. Please try again.');
        }

        $p = ImageProcessor::process($binary, (int) config('media.max_kb', 5120) * 1024, (array) config('media.variants', [480, 960]), $minSide);

        $base = trim($dir, '/').'/'.date('Y/m').'/'.Str::random(32);
        $disk = Storage::disk(self::diskName());
        $written = [];
        $variants = [];
        try {
            foreach ($p['files'] as $suffix => $data) {
                $path = $base.$suffix.'.'.$p['ext'];
                if (! $disk->put($path, $data, 'public')) {
                    throw new RuntimeException('write failed');
                }
                $written[] = $path;
                if ($suffix !== '') {
                    $variants[] = (int) ltrim($suffix, '-');
                }
            }
        } catch (\Throwable) {
            $disk->delete($written);
            throw new RuntimeException('The image could not be saved. Please try again.');
        }

        return [
            'path' => $base.'.'.$p['ext'],
            'width' => $p['width'],
            'height' => $p['height'],
            'size' => strlen($p['files']['']),
            'mime' => $p['mime'],
            'variants' => $variants,
            'name' => mb_substr(preg_replace('/[^\w. -]/u', '', (string) $file->getClientOriginalName()), 0, 120),
        ];
    }

    /** True when the file's own bytes say MP4/MOV-style or WebM video (the client-sent type is never trusted). */
    public static function isVideo(UploadedFile $file): bool
    {
        $h = @file_get_contents($file->getRealPath(), false, null, 0, 16);
        if ($h === false || strlen($h) < 12) {
            return false;
        }
        if (str_starts_with($h, "\x1A\x45\xDF\xA3")) {
            return true; // WebM / Matroska
        }

        // MP4 family: "ftyp" box, but not the still-image brands that share the container (HEIC, AVIF).
        return substr($h, 4, 4) === 'ftyp' && ! in_array(substr($h, 8, 4), ['heic', 'heix', 'heim', 'heis', 'hevc', 'mif1', 'msf1', 'avif', 'avis'], true);
    }

    /**
     * Stores a hero video as uploaded (no re-encoding on the server).
     *
     * @return array{path:string,width:?int,height:?int,size:int,mime:string,variants:int[],name:string}
     */
    public static function putVideo(UploadedFile $file, string $dir): array
    {
        if (! $file->isValid()) {
            throw new InvalidArgumentException('The upload did not finish. The video may be larger than the server allows; try a smaller one.');
        }
        $limit = (int) config('media.video_max_kb', 30720) * 1024;
        $size = (int) $file->getSize();
        if ($size > $limit) {
            throw new InvalidArgumentException('The video is larger than '.round($limit / 1048576).' MB. Please compress it and try again.');
        }
        if (! self::isVideo($file)) {
            throw new InvalidArgumentException('That file is not a valid MP4 or WebM video.');
        }
        $webm = str_starts_with((string) @file_get_contents($file->getRealPath(), false, null, 0, 4), "\x1A\x45\xDF\xA3");
        $ext = $webm ? 'webm' : 'mp4';

        $path = trim($dir, '/').'/'.date('Y/m').'/'.Str::random(32).'.'.$ext;
        $stream = @fopen($file->getRealPath(), 'rb');
        if ($stream === false) {
            throw new RuntimeException('The uploaded file could not be read. Please try again.');
        }
        try {
            if (! Storage::disk(self::diskName())->put($path, $stream, 'public')) {
                throw new RuntimeException('write failed');
            }
        } catch (\Throwable) {
            throw new RuntimeException('The video could not be saved. Please try again.');
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }

        return [
            'path' => $path,
            'width' => null,
            'height' => null,
            'size' => $size,
            'mime' => $webm ? 'video/webm' : 'video/mp4',
            'variants' => [],
            'name' => mb_substr(preg_replace('/[^\w. -]/u', '', (string) $file->getClientOriginalName()), 0, 120),
        ];
    }

    /** Removes the image and its smaller copies. Never throws. */
    public static function delete(?string $path, ?array $variants = null): void
    {
        if (! $path) {
            return;
        }
        $paths = [$path];
        foreach ($variants ?? [] as $w) {
            $paths[] = self::variantPath($path, (int) $w);
        }
        try {
            Storage::disk(self::diskName())->delete($paths);
        } catch (\Throwable) {
        }
    }

    /** "url 480w, url 960w, url 1600w" for the browser to pick from. */
    public static function srcset(string $path, ?array $variants, ?int $width): ?string
    {
        if (! $variants) {
            return null;
        }
        $parts = [];
        foreach ($variants as $w) {
            $parts[] = self::url(self::variantPath($path, (int) $w)).' '.(int) $w.'w';
        }
        if ($width) {
            $parts[] = self::url($path).' '.$width.'w';
        }

        return implode(', ', $parts);
    }
}
