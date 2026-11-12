<?php

namespace App\Services\Recommendation;

use App\Enums\BookSource;
use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\Recommendation;
use App\Services\BookLookupService;
use App\Services\LibraryService;
use App\Support\Isbn;

final class LibraryIntake
{
    public function __construct(
        private readonly BookLookupService $lookup,
        private readonly LibraryService $library,
        private readonly BlockedKeys $blockedKeys,
    ) {}

    /**
     * Creates the book in the library, with full metadata when there is an ISBN.
     * If the book is already in the collection, it does not create it again (the ISBN is unique).
     */
    public function add(Recommendation $recommendation, ReadingStatus $status, ?string $isbn = null): bool
    {
        if (array_intersect($this->blockedKeys->keysOf($recommendation), $this->blockedKeys->libraryKeys()) !== []) {
            return false;
        }

        // Chosen edition: its ISBN counts, not the suggestion's.
        $isbn = $isbn !== null ? Isbn::toIsbn13($isbn) : null;

        if ($isbn !== null) {
            if (Book::query()->where('isbn_13', $isbn)->exists()) {
                return false;
            }

            $recommendation->isbn_13 = $isbn;
        }

        $candidate = $recommendation->isbn_13 !== null ? $this->lookup->findByIsbn($recommendation->isbn_13) : null;

        $data = $candidate?->toArray() ?? [
            'title' => $recommendation->title,
            'subtitle' => null,
            'authors' => AuthorNames::split($recommendation->author),
            'isbn_13' => $recommendation->isbn_13,
            'isbn_10' => $recommendation->isbn_13 !== null ? Isbn::toIsbn10($recommendation->isbn_13) : null,
            'publisher' => null,
            'published_year' => null,
            'pages' => null,
            'genre' => null,
            'description' => null,
            'cover_url' => null,
            'source' => BookSource::OpenLibrary->value,
        ];

        $data['cover_url'] ??= $recommendation->cover_url;
        $data['status'] = $status->value;

        $this->library->add($data);

        return true;
    }
}
