<?php

namespace App\Services\BookLookup;

use App\Enums\BookSource;
use App\Support\Genres;
use App\Support\Isbn;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * ISBN only, and only Brazilian ones. It queries the CBL and local publishers, so it knows
 * books from small publishers that Open Library and Google Books do not have.
 */
class BrasilApiProvider implements MetadataProvider
{
    public function findByIsbn(string $isbn13): ?BookCandidate
    {
        if (! Isbn::isBrazilian($isbn13)) {
            return null;
        }

        try {
            $response = Http::acceptJson()
                ->connectTimeout(4)
                ->timeout(8)
                ->get("https://brasilapi.com.br/api/isbn/v1/{$isbn13}");
        } catch (ConnectionException $e) {
            Log::warning('BrasilAPI indisponível', ['error' => $e->getMessage()]);

            return null;
        }

        // A 404 means the ISBN is unknown, not a failure.
        if ($response->status() !== 404 && ! $response->successful()) {
            Log::warning('BrasilAPI respondeu com erro', ['status' => $response->status()]);
        }

        $book = $response->successful() ? $response->json() : null;

        if (! is_array($book) || ! is_string($book['title'] ?? null) || trim($book['title']) === '') {
            return null;
        }

        return new BookCandidate(
            title: trim($book['title']),
            source: BookSource::BrasilApi,
            isbn13: $isbn13,
            isbn10: Isbn::toIsbn10($isbn13),
            subtitle: BookCandidate::nonEmptyString($book['subtitle'] ?? null),
            authors: $this->authorsOf($book),
            publisher: BookCandidate::nonEmptyString($book['publisher'] ?? null),
            publishedYear: BookCandidate::yearFrom($book['year'] ?? null),
            pages: BookCandidate::positiveInt($book['page_count'] ?? null),
            genre: Genres::fromSubjects(is_array($book['subjects'] ?? null) ? $book['subjects'] : []),
            description: BookCandidate::nonEmptyString($book['synopsis'] ?? null),
            coverUrl: BookCandidate::nonEmptyString($book['cover_url'] ?? null),
        );
    }

    public function search(string $query, ?string $publisher = null): array
    {
        return [];
    }

    /**
     * BrasilAPI mixes author, translator, illustrator and even publisher in one list without saying
     * who is who ("Epicteto", "Edson Bini", "Karina Tenório", "Studio Mandragora"). The first is the
     * author; the others are almost always other roles, so they are left out (they can be added by
     * hand in the editor, and the other sources only bring authors).
     *
     * @param  array<mixed>  $book
     * @return list<string>
     */
    private function authorsOf(array $book): array
    {
        $names = BookCandidate::uniqueAuthors(is_array($book['authors'] ?? null) ? $book['authors'] : []);

        return array_slice($names, 0, 1);
    }
}
