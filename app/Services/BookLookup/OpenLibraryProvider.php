<?php

namespace App\Services\BookLookup;

use App\Enums\BookSource;
use App\Support\Isbn;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Fonte principal. A Books API (por ISBN) é legado segundo a própria documentação,
 * por isso a busca por título usa a Search API.
 */
class OpenLibraryProvider implements MetadataProvider
{
    private const SEARCH_FIELDS = 'key,title,subtitle,author_name,first_publish_year,isbn,number_of_pages_median,subject,cover_i';

    public function findByIsbn(string $isbn13): ?BookCandidate
    {
        $data = $this->get('/api/books', [
            'bibkeys' => "ISBN:{$isbn13}",
            'jscmd' => 'data',
            'format' => 'json',
        ]);

        $book = $data["ISBN:{$isbn13}"] ?? null;

        if (! is_array($book) || ! is_string($book['title'] ?? null)) {
            return null;
        }

        $candidate = new BookCandidate(
            title: $book['title'],
            source: BookSource::OpenLibrary,
            isbn13: $isbn13,
            isbn10: Isbn::toIsbn10($isbn13),
            subtitle: BookCandidate::nonEmptyString($book['subtitle'] ?? null),
            authors: BookCandidate::uniqueAuthors(array_column($book['authors'] ?? [], 'name')),
            publisher: BookCandidate::nonEmptyString($book['publishers'][0]['name'] ?? null),
            publishedYear: BookCandidate::yearFrom($book['publish_date'] ?? null),
            pages: BookCandidate::positiveInt($book['number_of_pages'] ?? null),
            genre: BookCandidate::nonEmptyString($book['subjects'][0]['name'] ?? null),
            coverUrl: BookCandidate::nonEmptyString($book['cover']['large'] ?? $book['cover']['medium'] ?? null),
        );

        // A edição muitas vezes não traz páginas; a obra traz a mediana entre as edições.
        if ($candidate->pages === null || $candidate->genre === null) {
            $work = $this->get('/search.json', [
                'isbn' => $isbn13,
                'fields' => 'number_of_pages_median,subject',
                'limit' => 1,
            ])['docs'][0] ?? null;

            if (is_array($work)) {
                $candidate = $candidate->fillFrom(new BookCandidate(
                    title: $candidate->title,
                    source: BookSource::OpenLibrary,
                    pages: BookCandidate::positiveInt($work['number_of_pages_median'] ?? null),
                    genre: BookCandidate::nonEmptyString($work['subject'][0] ?? null),
                ));
            }
        }

        return $candidate;
    }

    public function search(string $query): array
    {
        $docs = $this->get('/search.json', [
            'q' => $query,
            'fields' => self::SEARCH_FIELDS,
            'limit' => 10,
        ])['docs'] ?? [];

        $candidates = [];

        foreach (is_array($docs) ? $docs : [] as $doc) {
            if (! is_array($doc) || ! is_string($doc['title'] ?? null)) {
                continue;
            }

            $isbn13 = $this->pickIsbn(is_array($doc['isbn'] ?? null) ? $doc['isbn'] : []);
            $coverId = BookCandidate::positiveInt($doc['cover_i'] ?? null);

            $candidates[] = new BookCandidate(
                title: $doc['title'],
                source: BookSource::OpenLibrary,
                isbn13: $isbn13,
                isbn10: $isbn13 ? Isbn::toIsbn10($isbn13) : null,
                subtitle: BookCandidate::nonEmptyString($doc['subtitle'] ?? null),
                authors: BookCandidate::uniqueAuthors(is_array($doc['author_name'] ?? null) ? $doc['author_name'] : []),
                publishedYear: BookCandidate::yearFrom($doc['first_publish_year'] ?? null),
                pages: BookCandidate::positiveInt($doc['number_of_pages_median'] ?? null),
                genre: BookCandidate::nonEmptyString($doc['subject'][0] ?? null),
                coverUrl: $coverId ? "https://covers.openlibrary.org/b/id/{$coverId}-L.jpg" : null,
            );
        }

        return $candidates;
    }

    /**
     * A busca devolve obras, com os ISBNs de todas as edições.
     * Prefere uma edição brasileira; senão, o primeiro ISBN válido.
     *
     * @param  array<mixed>  $isbns
     */
    private function pickIsbn(array $isbns): ?string
    {
        $valid = array_values(array_filter(array_map(
            fn (mixed $isbn) => is_string($isbn) ? Isbn::toIsbn13($isbn) : null,
            $isbns,
        )));

        foreach ($valid as $isbn) {
            if (Isbn::isBrazilian($isbn)) {
                return $isbn;
            }
        }

        return $valid[0] ?? null;
    }

    /**
     * @param  array<string, string|int>  $query
     * @return array<mixed>
     */
    private function get(string $path, array $query): array
    {
        try {
            $response = $this->client()->get($path, $query);
        } catch (ConnectionException $e) {
            Log::warning('Open Library indisponível', ['path' => $path, 'error' => $e->getMessage()]);

            return [];
        }

        if (! $response->successful()) {
            Log::warning('Open Library respondeu com erro', ['path' => $path, 'status' => $response->status()]);

            return [];
        }

        $json = $response->json();

        return is_array($json) ? $json : [];
    }

    /**
     * Obras de um autor, com as edições de cada uma (por nome, não por chave).
     * Usado pelas sugestões; a busca por autor também traz obras de coautores.
     *
     * @return list<BookCandidate>
     */
    public function searchByAuthor(string $author): array
    {
        return $this->searchDocs(['author' => $author], 20);
    }

    /**
     * Obras com um assunto. Assuntos genéricos (ex.: "Fiction") trazem milhares de resultados.
     *
     * @return list<BookCandidate>
     */
    public function searchBySubject(string $subject): array
    {
        return $this->searchDocs(['subject' => $subject], 20);
    }

    /**
     * @param  array<string, string>  $query
     * @return list<BookCandidate>
     */
    private function searchDocs(array $query, int $limit): array
    {
        $docs = $this->get('/search.json', [
            ...$query,
            'fields' => self::SEARCH_FIELDS,
            'limit' => $limit,
        ])['docs'] ?? [];

        $candidates = [];

        foreach (is_array($docs) ? $docs : [] as $doc) {
            if (! is_array($doc) || ! is_string($doc['title'] ?? null)) {
                continue;
            }

            $isbn13 = $this->pickIsbn(is_array($doc['isbn'] ?? null) ? $doc['isbn'] : []);
            $coverId = BookCandidate::positiveInt($doc['cover_i'] ?? null);

            $candidates[] = new BookCandidate(
                title: $doc['title'],
                source: BookSource::OpenLibrary,
                isbn13: $isbn13,
                isbn10: $isbn13 ? Isbn::toIsbn10($isbn13) : null,
                subtitle: BookCandidate::nonEmptyString($doc['subtitle'] ?? null),
                authors: BookCandidate::uniqueAuthors(is_array($doc['author_name'] ?? null) ? $doc['author_name'] : []),
                publishedYear: BookCandidate::yearFrom($doc['first_publish_year'] ?? null),
                pages: BookCandidate::positiveInt($doc['number_of_pages_median'] ?? null),
                genre: BookCandidate::nonEmptyString($doc['subject'][0] ?? null),
                coverUrl: $coverId ? "https://covers.openlibrary.org/b/id/{$coverId}-L.jpg" : null,
            );
        }

        return $candidates;
    }

    private function client(): PendingRequest
    {
        return Http::baseUrl('https://openlibrary.org')
            ->withUserAgent(config('services.open_library.user_agent'))
            ->acceptJson()
            ->timeout(10);
    }
}
