<?php

namespace App\Services\Recommendation;

use App\Services\BookLookup\BookCandidate;
use App\Support\BookIdentity;

final class SuggestionCollector
{
    public function __construct(private readonly CandidateFinder $finder) {}

    /**
     * Gathers the candidates of every source, merging the ones several sources point to.
     *
     * @param  list<Source>  $sources
     * @param  array<string, true>  $blocked
     * @return list<Suggestion>
     */
    public function collect(array $sources, array $blocked, int $page, float $deadline): array
    {
        /** @var array<int, Suggestion> $found */
        $found = [];
        /** @var array<string, int> $index identity key → position in $found */
        $index = [];

        foreach ($sources as $source) {
            // Searches go over the network: on timeout, it carries on with what already came (at least one source).
            if ($found !== [] && SearchBudget::isExceeded($deadline)) {
                break;
            }

            foreach ($this->finder->forSource($source, $page) as $suggestion) {
                $keys = self::keysOf($suggestion->candidate);

                if (array_intersect_key(array_flip($keys), $blocked) !== []) {
                    continue;
                }

                $position = null;

                foreach ($keys as $key) {
                    $position ??= $index[$key] ?? null;
                }

                $current = $position === null ? null : $found[$position];

                if ($current === null) {
                    $position = count($found);
                    $found[$position] = new Suggestion($suggestion->candidate, $suggestion->reason, $source, $source->weight);
                } elseif ($current->basedOn->origin === $source->origin && ! $current->includes($source)) {
                    $found[$position] = $current->withSource($source);
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
