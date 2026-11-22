<?php

// Where uploaded website images are stored and how strict the checks are.
return [
    // Laravel disk name. "public" = this server's storage/app/public (run `php artisan storage:link` once).
    // To use S3 or another cloud disk, configure it in config/filesystems.php and set MEDIA_DISK=s3 in api/.env.
    'disk' => env('MEDIA_DISK', 'public'),

    // Largest accepted upload, in kilobytes. The PHP limits upload_max_filesize and post_max_size must be at least this big.
    'max_kb' => (int) env('MEDIA_MAX_KB', 5120),

    // Largest accepted hero video (MP4 or WebM), in kilobytes. PHP's upload_max_filesize / post_max_size must be at least this big.
    'video_max_kb' => (int) env('MEDIA_VIDEO_MAX_KB', 30720),

    // Widths of the smaller copies made for every upload (the full image is kept at up to 2000 px wide).
    'variants' => [480, 960],
];
