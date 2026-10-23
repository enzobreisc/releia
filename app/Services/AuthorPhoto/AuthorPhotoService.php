<?php

namespace App\Services\AuthorPhoto;

use App\Models\Author;
use App\Services\AuthorService;
use App\Services\BookLookup\OpenLibraryProvider;

/**
 * Finds and stores the photo of an author the first time it is needed. A failed lookup is
 * remembered, so a page view does not repeat network calls on every request.
 */
class AuthorPhotoService
{
    private const RETRY_AFTER_DAYS = 7;

    /** Famous authors have many duplicate records; the first few are enough to find a photo. */
    private const MAX_RECORDS = 5;

    /** @var list<AuthorPhotoSource> */
    private array $sources;

    public function __construct(
        private readonly AuthorService $authors,
        private readonly OpenLibraryProvider $openLibrary,
        private readonly AuthorPhotoStore $store,
        OpenLibraryPhotoSource $openLibrarySource,
        WikipediaPhotoSource $wikipediaSource,
    ) {
        $this->sources = [$openLibrarySource, $wikipediaSource];
    }

    public function ensurePhoto(Author $author): void
    {
        if ($author->photo_path !== null || $this->wasLookedUpRecently($author)) {
            return;
        }

        $this->lookUp($author);
        $author->update(['photo_looked_up_at' => now()]);
    }

    private function wasLookedUpRecently(Author $author): bool
    {
        return $author->photo_looked_up_at !== null
            && $author->photo_looked_up_at->greaterThan(now()->subDays(self::RETRY_AFTER_DAYS));
    }

    private function lookUp(Author $author): void
    {
        $keys = array_slice($this->authors->keys($author), 0, self::MAX_RECORDS);
        $records = array_values(array_filter(array_map($this->openLibrary->authorRecord(...), $keys)));

        if ($records === []) {
            return;
        }

        foreach ($this->sources as $source) {
            $url = $source->findPhotoUrl($records);

            if ($url !== null && $this->store->download($author, $url)) {
                return;
            }
        }
    }
}
