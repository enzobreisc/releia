<?php

namespace App\Services\Recommendation;

use App\Http\Requests\InputLimits;
use App\Models\Author;
use App\Models\ShoppingItem;
use App\Support\BookIdentity;

/**
 * Matches the names a request gives to the authors of your library and shopping list, so the search asks Open
 * Library for the spelling you use. The rule is AuthorNameMatch, shared with the pending suggestions.
 */
final class AuthorResolver
{
    /**
     * @param  list<string>  $included
     * @param  list<string>  $excluded
     */
    public function resolve(array $included, array $excluded): AuthorResolution
    {
        $known = $this->knownAuthors();
        $excludedAuthors = $this->matchedAuthors($excluded, $known);
        $authors = array_diff_key($this->requestedAuthors($included, $known), $excludedAuthors);

        return new AuthorResolution(
            array_slice(array_values($authors), 0, InputLimits::SUGGESTION_AUTHORS),
            array_slice(array_values($excludedAuthors), 0, InputLimits::SUGGESTION_AUTHORS),
        );
    }

    /**
     * @return array<string, string> author key → name, from your library and shopping list
     */
    private function knownAuthors(): array
    {
        $names = [
            ...Author::query()->pluck('name')->map(BookIdentity::givenNamesFirst(...))->all(),
            ...ShoppingItem::query()->whereNotNull('author')->pluck('author')->flatMap(AuthorNames::names(...))->all(),
        ];

        $known = [];

        foreach ($names as $name) {
            $known[BookIdentity::normalize($name)] ??= $name;
        }

        return $known;
    }

    /**
     * @param  list<string>  $names
     * @param  array<string, string>  $known
     * @return array<string, string>
     */
    private function matchedAuthors(array $names, array $known): array
    {
        $matched = [];

        foreach ($names as $name) {
            foreach ($this->keysMatching($name, $known) as $key) {
                $matched[$key] = $known[$key];
            }
        }

        return $matched;
    }

    /**
     * A name that matches nothing is kept as written, so it is searched loosely.
     *
     * @param  list<string>  $names
     * @param  array<string, string>  $known
     * @return array<string, RequestedAuthor>
     */
    private function requestedAuthors(array $names, array $known): array
    {
        $requested = [];

        foreach ($names as $name) {
            $keys = $this->keysMatching($name, $known);

            if ($keys === []) {
                $requested[BookIdentity::normalize($name)] = new RequestedAuthor($name, isExact: false);

                continue;
            }

            foreach ($keys as $key) {
                $requested[$key] = new RequestedAuthor($known[$key], isExact: true);
            }
        }

        return $requested;
    }

    /**
     * @param  array<string, string>  $known
     * @return list<string>
     */
    private function keysMatching(string $name, array $known): array
    {
        return array_values(array_filter(
            array_keys($known),
            fn (string $key): bool => AuthorNameMatch::matches($name, $known[$key]),
        ));
    }
}
