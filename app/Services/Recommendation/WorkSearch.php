<?php

namespace App\Services\Recommendation;

use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookup\OpenLibraryProvider;
use App\Support\BookIdentity;
use App\Support\Isbn;

final class WorkSearch
{
    public function __construct(
        private readonly OpenLibraryProvider $openLibrary,
        private readonly CandidateCache $cache,
        private readonly PortugueseEditions $editions,
    ) {}

    /**
     * Books by an author, on a subject or with a title matching the text ("Gogol", "Russian literature"),
     * most relevant first and without repeated works. Each work comes in its Brazilian edition
     * (Portuguese title, cover and ISBN) when there is one, otherwise as found. Works that only
     * show up in the Portuguese search (another record than the original) come last.
     *
     * @return list<BookCandidate>
     */
    public function search(string $text): array
    {
        $text = trim($text);

        if ($text === '') {
            return [];
        }

        $key = BookIdentity::normalize($text);
        $works = $this->cache->remember('search-works:'.$key, fn () => $this->openLibrary->searchWorks($text));
        $portuguese = $this->indexByWork($this->cache->remember('search-works-por:'.$key, fn () => $this->openLibrary->searchWorks($text, 'por')));
        $deadline = SearchBudget::deadline();
        $seen = [];
        $results = [];

        $workKeys = array_filter(array_map(fn (BookCandidate $work) => $work->workKey, $works));
        $portugueseOnly = array_filter($portuguese, fn (string $key) => ! in_array($key, $workKeys, true), ARRAY_FILTER_USE_KEY);

        foreach ([...$works, ...array_values($portugueseOnly)] as $work) {
            $candidate = SearchBudget::isExceeded($deadline) ? $work : $this->withBrazilianEdition($work, $portuguese);
            $identity = BookIdentity::normalizeTitle($candidate->title).'|'.BookIdentity::normalize($candidate->authors[0] ?? '');

            if (! isset($seen[$identity])) {
                $seen[$identity] = true;
                $results[] = $candidate;
            }
        }

        return $results;
    }

    /**
     * @param  list<BookCandidate>  $candidates
     * @return array<string, BookCandidate>
     */
    private function indexByWork(array $candidates): array
    {
        $index = [];

        foreach ($candidates as $candidate) {
            if ($candidate->workKey !== null) {
                $index[$candidate->workKey] ??= $candidate;
            }
        }

        return $index;
    }

    /**
     * The work comes with its original title; its Brazilian ISBN, found in the Portuguese search,
     * brings the title, authors and cover in Portuguese.
     *
     * @param  array<string, BookCandidate>  $portuguese  by work key
     */
    private function withBrazilianEdition(BookCandidate $work, array $portuguese): BookCandidate
    {
        $isbn = $work->workKey === null ? null : ($portuguese[$work->workKey]->isbn13 ?? null);

        if ($isbn === null || ! Isbn::isBrazilian($isbn)) {
            return $work;
        }

        $edition = $this->editions->findByIsbn($isbn);

        return $edition === null || $edition->title === '' ? $work : $edition->fillFrom($work);
    }
}
