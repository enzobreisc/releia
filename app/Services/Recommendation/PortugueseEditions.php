<?php

namespace App\Services\Recommendation;

use App\Models\Book;
use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookup\BrasilApiProvider;
use App\Services\BookLookupService;
use Illuminate\Support\Facades\Cache;

final class PortugueseEditions
{
    public function __construct(
        private readonly BrasilApiProvider $brasilApi,
        private readonly BookLookupService $lookup,
    ) {}

    /**
     * The Open Library work comes with the original title ("The Hobbit"). The Brazilian edition,
     * fetched by ISBN, brings the title, authors and cover in Portuguese; without it, it does not suggest.
     */
    public function localize(Suggestion $suggestion): ?Suggestion
    {
        $isbn = $suggestion->candidate->isbn13;

        if ($isbn === null) {
            return null;
        }

        $edition = $this->findByIsbn($isbn);

        if ($edition === null || $edition->title === '') {
            return null;
        }

        $candidate = $edition->fillFrom($suggestion->candidate);

        // Author and title come from the edition; the work's cover is only a fallback.
        return $suggestion->withCandidate($candidate, $this->reasonFor($suggestion));
    }

    /**
     * Edition by Brazilian ISBN: BrasilAPI first (one call, right title) and, if it
     * does not know it, the other sources. Each ISBN is cached.
     */
    public function findByIsbn(string $isbn): ?BookCandidate
    {
        $key = 'author-edition:'.$isbn;
        $cached = Cache::get($key);

        if ($cached !== null) {
            return BookCandidate::fromArray($cached);
        }

        $edition = $this->brasilApi->findByIsbn($isbn);

        if ($edition !== null) {
            Cache::put($key, $edition->toArray(), now()->addDays(30));

            return $edition;
        }

        return $this->lookup->findByIsbn($isbn);
    }

    /** "same author as A and B" / "shared subject: Fantasy, like A and B". Stored in the language it was generated in. */
    private function reasonFor(Suggestion $suggestion): string
    {
        $titles = array_map(fn (Book $book) => $book->title, [$suggestion->basedOn, ...$suggestion->also]);
        $last = array_pop($titles);
        $list = $titles === [] ? $last : implode(', ', $titles).' '.__('e').' '.$last;

        return $suggestion->kind === Suggestion::BY_AUTHOR
            ? __('mesmo autor que :titles', ['titles' => $list])
            : __('assunto em comum: :genre, como :titles', ['genre' => __((string) $suggestion->basedOn->genre), 'titles' => $list]);
    }
}
