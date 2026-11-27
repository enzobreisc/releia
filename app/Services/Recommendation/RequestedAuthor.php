<?php

namespace App\Services\Recommendation;

use App\Support\BookIdentity;

/**
 * An author the request asks for. A name matched to your library or shopping list must match exactly; a name
 * that matched nothing is searched as written, and a work counts when its author contains all its words.
 */
final readonly class RequestedAuthor
{
    public function __construct(
        public string $name,
        public bool $isExact,
    ) {}

    public function matches(string $authorName): bool
    {
        $wanted = BookIdentity::normalize($this->name);
        $candidate = BookIdentity::normalize($authorName);

        if ($this->isExact) {
            return $wanted === $candidate;
        }

        return array_diff(explode(' ', $wanted), explode(' ', $candidate)) === [];
    }
}
