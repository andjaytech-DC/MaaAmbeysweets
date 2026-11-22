<?php

namespace App\Console\Commands;

use App\Models\SiteMedia;
use App\Services\MediaStore;
use Illuminate\Console\Command;
use Illuminate\Http\UploadedFile;
use InvalidArgumentException;
use RuntimeException;

/**
 * Brings the pictures and videos that already sit in web/public/hero into the admin-managed hero slides,
 * using exactly the same checks and storage as an upload from the admin page.
 *
 *   php artisan media:import-hero                 (imports as drafts, nothing changes on the website yet)
 *   php artisan media:import-hero --publish       (imports and shows them straight away)
 *   php artisan media:import-hero "D:\other\folder"
 *
 * Safe to run again: a file already imported (same file name) is skipped, and identical copies are imported once.
 * A video named "name.mp4" uses "name-poster.jpg" (if present) as its cover picture.
 */
class ImportHeroMedia extends Command
{
    protected $signature = 'media:import-hero {folder? : Folder to read (default: ../web/public/hero)} {--publish : Show the imported slides on the website straight away}';

    protected $description = 'Import the pictures and videos from web/public/hero as hero slides';

    private const IMAGES = ['jpg', 'jpeg', 'png', 'webp'];

    private const VIDEOS = ['mp4', 'webm'];

    public function handle(): int
    {
        $folder = $this->argument('folder') ?: base_path('../web/public/hero');
        if (! is_dir($folder)) {
            $this->error("Folder not found: {$folder}");

            return self::FAILURE;
        }

        $files = [];
        $it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($folder, \FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) {
            if ($f->isFile() && in_array(strtolower($f->getExtension()), [...self::IMAGES, ...self::VIDEOS], true)) {
                $files[] = $f->getPathname();
            }
        }
        sort($files, SORT_NATURAL | SORT_FLAG_CASE);

        // Poster pictures that belong to a video are not slides of their own.
        $posterOf = [];
        foreach ($files as $path) {
            if (in_array(strtolower(pathinfo($path, PATHINFO_EXTENSION)), self::VIDEOS, true)) {
                $stem = pathinfo($path, PATHINFO_FILENAME);
                foreach (self::IMAGES as $ext) {
                    $poster = dirname($path).DIRECTORY_SEPARATOR."{$stem}-poster.{$ext}";
                    if (is_file($poster)) {
                        $posterOf[$path] = $poster;
                        break;
                    }
                }
            }
        }
        $isPoster = array_flip(array_values($posterOf));

        $status = $this->option('publish') ? 'published' : 'draft';
        $order = (int) SiteMedia::where('kind', 'hero')->max('sort_order');
        $seen = [];
        $done = $skipped = $failed = 0;

        foreach ($files as $path) {
            $name = basename($path);
            $clean = mb_substr(preg_replace('/[^\w. -]/u', '', $name), 0, 120);
            if (isset($isPoster[$path])) {
                continue;
            }
            $hash = sha1_file($path);
            if (isset($seen[$hash])) {
                $this->line("skip   {$name} (same picture as {$seen[$hash]})");
                $skipped++;

                continue;
            }
            $seen[$hash] = $name;
            if (SiteMedia::where('kind', 'hero')->where('original_name', $clean)->exists()) {
                $this->line("skip   {$name} (already imported)");
                $skipped++;

                continue;
            }

            $upload = new UploadedFile($path, $name, null, null, true);
            $cover = null;
            try {
                if (MediaStore::isVideo($upload)) {
                    $m = MediaStore::putVideo($upload, 'media/hero');
                    if (isset($posterOf[$path])) {
                        $cover = MediaStore::put(new UploadedFile($posterOf[$path], basename($posterOf[$path]), null, null, true), 'media/hero', 200);
                    }
                } else {
                    $m = MediaStore::put($upload, 'media/hero', 600);
                }
            } catch (InvalidArgumentException|RuntimeException $e) {
                $this->warn("FAILED {$name}: ".$e->getMessage());
                $failed++;

                continue;
            }

            SiteMedia::create([
                'kind' => 'hero',
                'disk' => MediaStore::diskName(),
                'path' => $m['path'],
                'variants' => $m['variants'] ?: null,
                'original_name' => $m['name'],
                'mime' => $m['mime'],
                'width' => $m['width'],
                'height' => $m['height'],
                'size_bytes' => $m['size'],
                'mobile_path' => $cover['path'] ?? null,
                'mobile_variants' => $cover['variants'] ?? null,
                'mobile_width' => $cover['width'] ?? null,
                'position' => 'center',
                'duration_ms' => str_starts_with($m['mime'], 'video/') ? 8000 : 6500,
                'is_active' => true,
                'status' => $status,
                'sort_order' => ++$order,
            ]);
            $this->info('ok     '.$name.(str_starts_with($m['mime'], 'video/') ? ' (video)' : ''));
            $done++;
        }

        $this->newLine();
        $this->line("Imported {$done}, skipped {$skipped}, failed {$failed}. Status: {$status}.");
        if ($status === 'draft' && $done) {
            $this->line('They are drafts: open Admin > Hero slides, check them, then press Publish.');
        }

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
