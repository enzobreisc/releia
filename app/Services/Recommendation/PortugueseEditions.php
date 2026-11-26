<?php

namespace App\Services\Recommendation;

use App\Services\BookLookup\BrazilianEditions;
use App\Services\BookLookup\PreferredPublishers;

final class PortugueseEditions
{
    public function __construct(
        private readonly BrazilianEditions $editions,
        private readonly PreferredPublishers $preferredPublishers,
    ) {}

    /**
     * The Open Library work comes with the original title ("The Hobbit"). A Brazilian edition, from your
     * publishers when possible, brings the title, authors and cover in Portuguese; without one, it does
     * not suggest.
     */
    public function localize(Suggestion $suggestion): ?Suggestion
    {
        $isbns = $this->preferredPublishers->sortIsbns($suggestion->candidate->brazilianIsbns)
            ?: array_filter([$suggestion->candidate->isbn13]);

        $edition = $this->editions->firstDescribed($isbns);

        if ($edition === null || $edition->title === '') {
            return null;
        }

        $candidate = $edition->fillFrom($suggestion->candidate);

        // Author and title come from the edition; the work's cover is only a fallback.
        return $suggestion->withCandidate($candidate, $this->reasonFor($suggestion));
    }

    /** Stored in the language it was generated in, so the reason is rebuilt from the same sources. */
    private function reasonFor(Suggestion $suggestion): string
    {
        $titles = array_map(fn (Source $source) => $source->title, [$suggestion->basedOn, ...$suggestion->also]);
        $last = array_pop($titles);
        $list = $titles === [] ? $last : implode(', ', $titles).' '.__('e').' '.$last;

        return $suggestion->basedOn->authorReason($list);
    }
}
