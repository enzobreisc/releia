<?php

namespace App\Services\Recommendation;

use App\Models\Book;
use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookup\OpenLibraryProvider;
use App\Support\BookIdentity;
use App\Support\Genres;
use App\Support\Isbn;

final class CandidateFinder
{
    /** Want-to-read + 5 × ratings on Open Library: below this, a little-known work. */
    private const MIN_SUBJECT_POPULARITY = 40;

    public function __construct(
        private readonly OpenLibraryProvider $openLibrary,
        private readonly CandidateCache $cache,
    ) {}

    /**
     * @return list<Suggestion>
     */
    public function forBook(Book $book, int $page): array
    {
        return [...$this->byAuthor($book), ...$this->bySubject($book, $page)];
    }

    /**
     * @return list<Suggestion>
     */
    private function byAuthor(Book $book): array
    {
        $author = $book->authors->first()?->name;

        if ($author === null) {
            return [];
        }

        $candidates = $this->cache->remember(
            'author:'.BookIdentity::normalize($author),
            fn () => $this->openLibrary->searchByAuthor($author),
        );

        $suggestions = [];

        foreach ($candidates as $candidate) {
            // The author search also returns works by co-authors and namesakes: only valid if the author is on the work.
            if (! $this->isUsable($candidate) || ! $this->isBy($candidate, $author)) {
                continue;
            }

            $suggestions[] = new Suggestion($candidate, __('mesmo autor que :titles', ['titles' => $book->title]), $book, Suggestion::BY_AUTHOR);
        }

        return $suggestions;
    }

    /**
     * @return list<Suggestion>
     */
    private function bySubject(Book $book, int $page): array
    {
        // The catalog genres are in Portuguese; Open Library indexes subjects in English.
        $subject = Genres::openLibrarySubject($book->genre) ?? $book->genre;

        if (! GenericSubjects::isUseful($subject) || $subject === null) {
            return [];
        }

        $candidates = $this->cache->remember(
            'subject:'.BookIdentity::normalize($subject).':p'.$page,
            fn () => $this->openLibrary->searchBySubject($subject, $page),
        );

        $suggestions = [];

        foreach ($candidates as $candidate) {
            if ($this->isUsable($candidate) && $this->fitsSubject($candidate, $book)) {
                $suggestions[] = new Suggestion($candidate, __('assunto em comum: :genre', ['genre' => __((string) $book->genre)]), $book, Suggestion::BY_SUBJECT);
            }
        }

        return $suggestions;
    }

    /**
     * A Brazilian edition to search in Portuguese, and a title that is not just an author's name.
     */
    private function isUsable(BookCandidate $candidate): bool
    {
        if ($candidate->isbn13 === null || ! Isbn::isBrazilian($candidate->isbn13)) {
            return false;
        }

        $title = BookIdentity::normalizeTitle($candidate->title);

        if ($title === '') {
            return false;
        }

        return ! in_array($title, array_map(BookIdentity::normalize(...), $candidate->authors), true);
    }

    /**
     * Subject search brings everything: it requires the same genre as the source book, a cover
     * and some popularity, so it does not suggest an obscure work.
     */
    private function fitsSubject(BookCandidate $candidate, Book $book): bool
    {
        if ($candidate->coverUrl === null || ($candidate->popularity ?? 0) < self::MIN_SUBJECT_POPULARITY) {
            return false;
        }

        // Without a known genre on the work there is no telling whether it is similar.
        return $candidate->genre !== null && $candidate->genre === $book->genre;
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
