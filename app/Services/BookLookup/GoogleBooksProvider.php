<?php

namespace App\Services\BookLookup;

use App\Enums\BookSource;
use App\Support\Isbn;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Fonte reserva. Sem chave, a cota diária é compartilhada entre todos e
 * costuma responder 429; com GOOGLE_BOOKS_API_KEY a cota é própria.
 */
class GoogleBooksProvider implements MetadataProvider
{
    public function findByIsbn(string $isbn13): ?BookCandidate
    {
        foreach ($this->volumes("isbn:{$isbn13}", 1) as $candidate) {
            return $candidate;
        }

        return null;
    }

    public function search(string $query, ?string $publisher = null): array
    {
        return $this->volumes($publisher ? "{$query} inpublisher:{$publisher}" : $query, 10);
    }

    /**
     * @return list<BookCandidate>
     */
    private function volumes(string $query, int $limit): array
    {
        try {
            $response = Http::acceptJson()
                ->timeout(10)
                ->get('https://www.googleapis.com/books/v1/volumes', array_filter([
                    'q' => $query,
                    'maxResults' => $limit,
                    'printType' => 'books',
                    'key' => config('services.google_books.key'),
                ]));
        } catch (ConnectionException $e) {
            Log::warning('Google Books indisponível', ['error' => $e->getMessage()]);

            return [];
        }

        if (! $response->successful()) {
            Log::warning('Google Books respondeu com erro', ['status' => $response->status()]);

            return [];
        }

        $items = $response->json('items');
        $candidates = [];

        foreach (is_array($items) ? $items : [] as $item) {
            $info = is_array($item) ? ($item['volumeInfo'] ?? null) : null;

            if (! is_array($info) || ! is_string($info['title'] ?? null)) {
                continue;
            }

            $identifiers = [];

            foreach ($info['industryIdentifiers'] ?? [] as $identifier) {
                $identifiers[$identifier['type'] ?? ''] = $identifier['identifier'] ?? '';
            }

            $isbn13 = Isbn::toIsbn13($identifiers['ISBN_13'] ?? $identifiers['ISBN_10'] ?? '');

            $candidates[] = new BookCandidate(
                title: $info['title'],
                source: BookSource::GoogleBooks,
                isbn13: $isbn13,
                isbn10: $isbn13 ? Isbn::toIsbn10($isbn13) : null,
                subtitle: BookCandidate::nonEmptyString($info['subtitle'] ?? null),
                authors: BookCandidate::uniqueAuthors(is_array($info['authors'] ?? null) ? $info['authors'] : []),
                publisher: BookCandidate::nonEmptyString($info['publisher'] ?? null),
                publishedYear: BookCandidate::yearFrom($info['publishedDate'] ?? null),
                pages: BookCandidate::positiveInt($info['pageCount'] ?? null),
                genre: BookCandidate::nonEmptyString($info['categories'][0] ?? null),
                description: BookCandidate::nonEmptyString($info['description'] ?? null),
                coverUrl: $this->coverUrl($info['imageLinks'] ?? null),
            );
        }

        return $candidates;
    }

    private function coverUrl(mixed $links): ?string
    {
        if (! is_array($links)) {
            return null;
        }

        $url = BookCandidate::nonEmptyString($links['thumbnail'] ?? $links['smallThumbnail'] ?? null);

        // As miniaturas vêm em http e com a "dobra" de página desenhada.
        return $url === null ? null : str_replace(['http://', '&edge=curl'], ['https://', ''], $url);
    }
}
