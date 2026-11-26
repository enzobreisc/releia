<?php

namespace App\Services\Recommendation;

use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookup\OpenLibraryAvailability;
use App\Services\BookLookup\OpenLibraryProvider;
use App\Support\BookIdentity;
use App\Support\Isbn;

final class CandidateFinder
{
    public function __construct(
        private readonly OpenLibraryProvider $openLibrary,
        private readonly CandidateCache $cache,
        private readonly OpenLibraryAvailability $availability,
    ) {}

    /**
     * @return list<Suggestion>
     */
    public function forSource(Source $source, int $page): array
    {
        $author = $source->author;

        if ($author === null) {
            return [];
        }

        // Most authors do not fill every page, and an empty one would leave them out of the search.
        $candidates = $this->worksOf($author, $page);

        if ($candidates === [] && $page > 1 && ! $this->availability->hasJustFailed()) {
            $candidates = $this->worksOf($author, 1);
        }

        $suggestions = [];

        foreach ($candidates as $candidate) {
            // The author search also returns works by co-authors and namesakes: only valid if the author is on the work.
            if (! $this->isUsable($candidate) || ! $this->isBy($candidate, $author)) {
                continue;
            }

            $suggestions[] = new Suggestion($candidate, $source->authorReason($source->title), $source);
        }

        return $suggestions;
    }

    /**
     * @return list<BookCandidate>
     */
    private function worksOf(string $author, int $page): array
    {
        return $this->cache->remember(
            'author:'.BookIdentity::normalize($author).':p'.$page,
            fn () => $this->openLibrary->searchByAuthor($author, $page),
        );
    }

    /**
     * A Brazilian edition to search in Portuguese, and a title that is not just an author's name.
     */
    private function isUsable(BookCandidate $candidate): bool
    {
        if ($candidate->isbn13 === null || ! Isbn::isBrazilian($candidate->isbn13)) {
            return false;
        }

        return BookIdentity::normalizeTitle($candidate->title) !== ''
            && ! BookIdentity::isAuthorName($candidate->title, $candidate->authors);
    }

    private function isBy(BookCandidate $candidate, string $author): bool
    {
        return in_array(
            BookIdentity::normalize($author),
            array_map(BookIdentity::normalize(...), $candidate->authors),
            true,
        );
    }
}
