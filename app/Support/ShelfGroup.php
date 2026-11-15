<?php

namespace App\Support;

/**
 * One value of a grouping, such as one publisher: the key ignores spelling, the label is shown.
 */
final readonly class ShelfGroup
{
    public function __construct(public string $key, public string $label) {}
}
