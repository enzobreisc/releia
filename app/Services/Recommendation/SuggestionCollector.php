<?php

namespace App\Services\Recommendation;

use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookup\OpenLibraryAvailability;
use App\Support\BookIdentity;

final class SuggestionCollector
{
    public function __construct(
        private readonly CandidateFinder $finder,
        private readonly OpenLibraryAvailability $availability,
    ) {}

    /**
     * Gathers the candidates of every source, merging the ones several sources point to.
     *
     * @param  list<Source>  $sources
     * @return list<Suggestion>
     */
    public function collect(array $sources, SuggestionSearch $search, int $page): array
    {
        /** @var array<int, Suggestion> $found */
        $found = [];
        /** @var array<string, int> $index identity key → position in $found */
        $index = [];
        $blocked = $search->blocked();

        foreach ($sources as $source) {
            // Searches go over the network: on timeout, it carries on with what already came.
            if ($search->isOutOfTime() || $this->availability->isUnavailable()) {
                break;
            }

            foreach ($this->finder->forSource($source, $page, $search) as $suggestion) {
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
