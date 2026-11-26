<?php

namespace App\Services\Recommendation;

use App\Enums\BookSource;
use App\Models\Recommendation;
use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookup\BrazilianEditions;
use App\Services\BookLookup\OpenLibraryProvider;
use App\Services\BookLookupService;

final class WorkEditions
{
    public function __construct(
        private readonly OpenLibraryProvider $openLibrary,
        private readonly BookLookupService $lookup,
        private readonly BrazilianEditions $brazilianEditions,
    ) {}

    /**
     * Editions of the suggested work, to pick which one to read: the suggested one first, then the
     * others, Brazilian first.
     *
     * @return list<BookCandidate>
     */
    public function for(Recommendation $recommendation): array
    {
        $editions = $this->ofWork($recommendation);
        $isbn = $recommendation->isbn_13;

        if ($isbn === null) {
            return $editions;
        }

        $others = array_values(array_filter($editions, fn (BookCandidate $edition) => $edition->isbn13 !== $isbn));
        $listed = array_values(array_filter($editions, fn (BookCandidate $edition) => $edition->isbn13 === $isbn));

        return [$this->suggested($recommendation, $isbn, $listed[0] ?? null), ...$others];
    }

    /**
     * @return list<BookCandidate>
     */
    private function ofWork(Recommendation $recommendation): array
    {
        // Old suggestions did not store the work: find it by ISBN and store it for next time.
        if ($recommendation->work_key === null && $recommendation->isbn_13 !== null) {
            $key = $this->openLibrary->workKeyForIsbn($recommendation->isbn_13);

            if ($key !== null) {
                $recommendation->update(['work_key' => $key]);
            }
        }

        if ($recommendation->work_key === null) {
            return [];
        }

        return $this->lookup->editions($recommendation->work_key, AuthorNames::split($recommendation->author));
    }

    /**
     * The edition of the suggestion, with the cover it is shown with. The work may not list it, since it
     * can come from another catalog.
     */
    private function suggested(Recommendation $recommendation, string $isbn, ?BookCandidate $listed): BookCandidate
    {
        $suggested = new BookCandidate(
            title: $recommendation->title,
            source: BookSource::OpenLibrary,
            isbn13: $isbn,
            authors: AuthorNames::split($recommendation->author),
            coverUrl: $recommendation->cover_url,
        );

        $edition = $listed ?? $this->brazilianEditions->findByIsbn($isbn);

        if ($edition === null) {
            return $suggested;
        }

        $filled = $edition->fillFrom($suggested);

        return $recommendation->cover_url === null ? $filled : $filled->withCover($recommendation->cover_url);
    }
}
