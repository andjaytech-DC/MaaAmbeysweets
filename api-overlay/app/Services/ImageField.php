<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/** Applies an uploaded picture (or its removal) to a model with `{field}_path` / `{field}_variants` columns. */
class ImageField
{
    /**
     * Sets the new picture on the model (not saved yet) and returns the old one so it can be deleted after saving.
     *
     * @return array{0:?string,1:?array}|null
     *
     * @throws \InvalidArgumentException
     * @throws \RuntimeException
     */
    public static function apply(Model $m, string $field, Request $request, string $dir, int $minSide = 200): ?array
    {
        $old = [$m->{$field.'_path'}, $m->{$field.'_variants'}];
        if ($request->hasFile($field)) {
            $new = MediaStore::put($request->file($field), $dir, $minSide);
            $m->{$field.'_path'} = $new['path'];
            $m->{$field.'_variants'} = $new['variants'];

            return $old;
        }
        if ($request->boolean('remove_'.$field) && $old[0]) {
            $m->{$field.'_path'} = null;
            $m->{$field.'_variants'} = null;

            return $old;
        }

        return null;
    }

    public static function cleanup(?array $old): void
    {
        if ($old) {
            MediaStore::delete($old[0], $old[1]);
        }
    }
}
