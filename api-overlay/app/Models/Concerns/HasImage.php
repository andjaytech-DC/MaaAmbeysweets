<?php

namespace App\Models\Concerns;

use App\Services\MediaStore;

/** For models with `{field}_path` and `{field}_variants` columns (photo, image, thumbnail). */
trait HasImage
{
    public function imageUrlOf(string $field): ?string
    {
        $p = $this->{$field.'_path'};

        return $p ? MediaStore::url($p) : null;
    }

    public function imageSrcsetOf(string $field): ?string
    {
        $p = $this->{$field.'_path'};

        return $p ? MediaStore::srcset($p, $this->{$field.'_variants'}, null) : null;
    }
}
