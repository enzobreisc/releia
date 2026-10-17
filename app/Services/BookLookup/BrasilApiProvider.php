<?php

namespace App\Services\BookLookup;

use App\Enums\BookSource;
use App\Support\Genres;
use App\Support\Isbn;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Só ISBN, e só brasileiro. Consulta a CBL e editoras locais, então conhece
 * livros de editoras pequenas que Open Library e Google Books não têm.
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

        // 404 é "não conheço este ISBN", não falha.
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
     * A BrasilAPI mistura autor, tradutor, ilustrador e até a editora na mesma lista, sem dizer
     * quem é quem ("Epicteto", "Edson Bini", "Karina Tenório", "Studio Mandragora"). O primeiro é
     * o autor; os demais são, quase sempre, outras funções, então ficam de fora (dá para
     * acrescentar à mão no editor, e as outras fontes só trazem autores).
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
