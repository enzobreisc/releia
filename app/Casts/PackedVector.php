<?php

namespace App\Casts;

use App\Services\Ai\Vector;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * @implements CastsAttributes<list<float>, list<float>>
 */
final class PackedVector implements CastsAttributes
{
    /**
     * @param  array<string, mixed>  $attributes
     * @return list<float>
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): array
    {
        return Vector::unpack((string) $value);
    }

    /**
     * @param  list<float>  $value
     * @param  array<string, mixed>  $attributes
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): string
    {
        return Vector::pack($value);
    }
}
