<?php

namespace App\Services\Recommendation;

use App\Models\Book;
use App\Services\BookLookup\BookCandidate;
use App\Support\BookIdentity;
use Illuminate\Support\Collection;

final class SuggestionCollector
{
    public function __construct(private readonly CandidateFinder $finder) {}

    /**
     * Gathers the candidates of every source book, merging the ones several books point to.
     *
     * @param  Collection<int, array{0: Book, 1: float}>  $sources
     * @param  array<string, true>  $blocked
     * @return list<Suggestion>
     */
    public function collect(Collection $sources, array $blocked, int $page, float $deadline): array
    {
        /** @var array<int, Suggestion> $found */
        $found = [];
        /** @var array<string, int> $index identity key → position in $found */
        $index = [];

        foreach ($sources as [$book, $weight]) {
            // Searches go over the network: on timeout, it carries on with what already came (at least one book).
            if ($found !== [] && SearchBudget::isExceeded($deadline)) {
                break;
            }

            foreach ($this->finder->forBook($book, $page) as $suggestion) {
                $keys = self::keysOf($suggestion->candidate);

                if (array_intersect_key(array_flip($keys), $blocked) !== []) {
                    continue;
                }

                $position = null;

                foreach ($keys as $key) {
                    $position ??= $index[$key] ?? null;
                }

                $current = $position === null ? null : $found[$position];

                if ($current === null || ($current->kind === Suggestion::BY_SUBJECT && $suggestion->kind === Suggestion::BY_AUTHOR)) {
                    // New, or the same author replaces a subject-only reason: the stronger reason wins.
                    $position ??= count($found);
                    $found[$position] = new Suggestion($suggestion->candidate, $suggestion->reason, $book, $suggestion->kind, $weight);
                } elseif ($current->kind === $suggestion->kind && ! in_array($book->id, array_map(fn (Book $b) => $b->id, [$current->basedOn, ...$current->also]), true)) {
                    $found[$position] = $current->withSource($book, $weight);
                }

                foreach ($keys as $key) {
                    $index[$key] = $position;
                }
            }
        }

        return array_values($found);
    }

    /**
     * @return list<string>
     */
    public static function keysOf(BookCandidate $candidate): array
    {
        return BookIdentity::keys($candidate->title, $candidate->authors, $candidate->isbn13, $candidate->isbn10);
    }
}
