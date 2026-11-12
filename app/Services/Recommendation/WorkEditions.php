<?php

namespace App\Services\Recommendation;

use App\Models\Recommendation;
use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookup\OpenLibraryProvider;
use App\Services\BookLookupService;

final class WorkEditions
{
    public function __construct(
        private readonly OpenLibraryProvider $openLibrary,
        private readonly BookLookupService $lookup,
    ) {}

    /**
     * Editions of the suggested work, Brazilian first, to pick which one to read.
     *
     * @return list<BookCandidate>
     */
    public function for(Recommendation $recommendation): array
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
}
