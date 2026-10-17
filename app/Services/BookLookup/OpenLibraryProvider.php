<?php

namespace App\Services\BookLookup;

use App\Enums\BookSource;
use App\Support\BookIdentity;
use App\Support\Genres;
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
    private const SEARCH_FIELDS = 'key,title,subtitle,author_name,first_publish_year,isbn,number_of_pages_median,subject,cover_i,edition_count,want_to_read_count,ratings_count';

    /** As sugestões só valem para obras com edição em português; `sort` traz as mais queridas primeiro. */
    private const SUGGESTION_LANGUAGE = 'por';

    /** Obras populares têm dezenas de edições; 200 cobre quase todas numa chamada. */
    private const EDITIONS_LIMIT = 200;

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
            genre: Genres::fromSubjects(array_column(is_array($book['subjects'] ?? null) ? $book['subjects'] : [], 'name')),
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
                    genre: Genres::fromSubjects(is_array($work['subject'] ?? null) ? $work['subject'] : []),
                ));
            }
        }

        return $candidate;
    }

    public function search(string $query, ?string $publisher = null): array
    {
        $docs = $this->get('/search.json', array_filter([
            'q' => $query,
            // Filtra obras que têm alguma edição dessa editora (ignora acentos).
            'publisher' => $publisher,
            'fields' => self::SEARCH_FIELDS,
            'limit' => 10,
        ]))['docs'] ?? [];

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
                genre: Genres::fromSubjects(is_array($doc['subject'] ?? null) ? $doc['subject'] : []),
                coverUrl: $coverId ? "https://covers.openlibrary.org/b/id/{$coverId}-L.jpg" : null,
                workKey: self::workKey($doc['key'] ?? null),
                editionCount: BookCandidate::positiveInt($doc['edition_count'] ?? null),
            );
        }

        return $candidates;
    }

    /**
     * Edições de uma obra. As edições não trazem o nome dos autores (só
     * referências), por isso quem chama completa com os autores da obra.
     *
     * @return list<BookCandidate>
     */
    public function editions(string $workKey): array
    {
        $entries = $this->get("/works/{$workKey}/editions.json", ['limit' => self::EDITIONS_LIMIT])['entries'] ?? [];
        $editions = [];

        foreach (is_array($entries) ? $entries : [] as $entry) {
            if (! is_array($entry) || ! is_string($entry['title'] ?? null)) {
                continue;
            }

            $isbns = array_merge(
                is_array($entry['isbn_13'] ?? null) ? $entry['isbn_13'] : [],
                is_array($entry['isbn_10'] ?? null) ? $entry['isbn_10'] : [],
            );
            $isbn13 = $this->pickIsbn($isbns);
            $coverId = BookCandidate::positiveInt($entry['covers'][0] ?? null);
            $language = $entry['languages'][0]['key'] ?? null;

            $editions[] = new BookCandidate(
                title: $entry['title'],
                source: BookSource::OpenLibrary,
                isbn13: $isbn13,
                isbn10: $isbn13 ? Isbn::toIsbn10($isbn13) : null,
                subtitle: BookCandidate::nonEmptyString($entry['subtitle'] ?? null),
                publisher: BookCandidate::nonEmptyString($entry['publishers'][0] ?? null),
                publishedYear: BookCandidate::yearFrom($entry['publish_date'] ?? null),
                pages: BookCandidate::positiveInt($entry['number_of_pages'] ?? null),
                coverUrl: $coverId ? "https://covers.openlibrary.org/b/id/{$coverId}-L.jpg" : null,
                workKey: $workKey,
                language: is_string($language) ? basename($language) : null,
            );
        }

        return $editions;
    }

    /** Obra (chave "OL1003040W") a que um ISBN pertence, ou null se a Open Library não conhece a edição. */
    public function workKeyForIsbn(string $isbn13): ?string
    {
        $doc = $this->get('/search.json', ['isbn' => $isbn13, 'fields' => 'key', 'limit' => 1])['docs'][0] ?? null;

        return is_array($doc) ? self::workKey($doc['key'] ?? null) : null;
    }

    /** "/works/OL1003040W" vira "OL1003040W". */
    public static function workKey(mixed $key): ?string
    {
        return is_string($key) && preg_match('#^/works/(OL\d+W)$#', $key, $match) ? $match[1] : null;
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
    public function searchByAuthor(string $author, int $page = 1): array
    {
        return $this->searchDocs(['author' => $author, 'language' => self::SUGGESTION_LANGUAGE, 'sort' => 'want_to_read', 'page' => $page], 20);
    }

    /**
     * Obras com um assunto. Assuntos genéricos (ex.: "Fiction") trazem milhares de resultados.
     *
     * @return list<BookCandidate>
     */
    public function searchBySubject(string $subject, int $page = 1): array
    {
        return $this->searchDocs(['subject' => $subject, 'language' => self::SUGGESTION_LANGUAGE, 'sort' => 'want_to_read', 'page' => $page], 30);
    }

    /**
     * Chaves do autor na Open Library a partir de um livro dele. A Open Library costuma ter
     * o mesmo autor cadastrado mais de uma vez ("Júnior" e "Junior"); a busca por ISBN
     * devolve `author_name` e `author_key` na mesma ordem, então o nome escolhe as chaves.
     *
     * @return list<string>
     */
    public function authorKeysForIsbn(string $isbn13, string $name): array
    {
        $doc = $this->get('/search.json', [
            'isbn' => $isbn13,
            'fields' => 'author_name,author_key',
            'limit' => 1,
        ])['docs'][0] ?? null;

        return is_array($doc) ? $this->matchingAuthorKeys($doc, $name) : [];
    }

    /**
     * Igual, mas pelo título do livro, para edições que a Open Library não tem por ISBN.
     * Só vale a obra com o mesmo título (sem subtítulo nem parênteses) e um autor de nome parecido:
     * título igual não basta, outro livro pode ter o mesmo nome.
     *
     * @return list<string>
     */
    public function authorKeysForTitle(string $title, string $name): array
    {
        // "O Tatuador de Auschwitz. Baseado na história real…": o subtítulo depois do ponto não conta.
        $shorten = fn (string $value) => BookIdentity::normalizeTitle((string) preg_replace('/\.\s.*$/', '', $value));
        $wanted = $shorten($title);

        if ($wanted === '') {
            return [];
        }

        $docs = $this->get('/search.json', [
            'title' => $wanted,
            'fields' => 'title,author_name,author_key',
            'limit' => 10,
        ])['docs'] ?? [];

        $keys = [];

        foreach (is_array($docs) ? $docs : [] as $doc) {
            if (is_array($doc) && is_string($doc['title'] ?? null) && $shorten($doc['title']) === $wanted) {
                $keys = [...$keys, ...$this->matchingAuthorKeys($doc, $name)];
            }
        }

        return array_values(array_unique($keys));
    }

    /**
     * @param  array<mixed>  $doc  com `author_name` e `author_key` na mesma ordem
     * @return list<string>
     */
    private function matchingAuthorKeys(array $doc, string $name): array
    {
        if (! is_array($doc['author_name'] ?? null) || ! is_array($doc['author_key'] ?? null)) {
            return [];
        }

        $keys = [];

        foreach ($doc['author_name'] as $index => $candidate) {
            if (is_string($candidate) && self::similarName($candidate, $name) && is_string($doc['author_key'][$index] ?? null)) {
                $keys[] = $doc['author_key'][$index];
            }
        }

        // Não vale "o único autor listado": a Open Library às vezes põe o tradutor no lugar do autor.
        return $keys;
    }

    /**
     * Chaves do autor pelo nome, só quando não há dúvida: um único autor com esse nome ou um
     * claramente mais conhecido (3× mais obras). Nesse caso entram também os cadastros
     * duplicados com o mesmo nome. Homônimos parecidos devolvem lista vazia.
     *
     * @return list<string>
     */
    public function authorKeysByName(string $name): array
    {
        $docs = $this->get('/search/authors.json', ['q' => $name, 'limit' => 10])['docs'] ?? [];

        $matches = array_values(array_filter(
            is_array($docs) ? $docs : [],
            fn (mixed $doc) => is_array($doc) && is_string($doc['key'] ?? null) && is_string($doc['name'] ?? null) && self::sameName($doc['name'], $name),
        ));

        usort($matches, fn (array $a, array $b) => ($b['work_count'] ?? 0) <=> ($a['work_count'] ?? 0));

        if ($matches === [] || (count($matches) > 1 && ($matches[0]['work_count'] ?? 0) < 3 * ($matches[1]['work_count'] ?? 0))) {
            return [];
        }

        return array_column($matches, 'key');
    }

    /**
     * Todos os cadastros com exatamente esse nome e a quantidade de obras de cada um. Quem usa
     * precisa confirmar com um livro da biblioteca, porque pode haver homônimos.
     *
     * @return array<string, int>
     */
    public function authorKeyCandidatesByName(string $name): array
    {
        $docs = $this->get('/search/authors.json', ['q' => $name, 'limit' => 10])['docs'] ?? [];
        $candidates = [];

        foreach (is_array($docs) ? $docs : [] as $doc) {
            if (is_array($doc) && is_string($doc['key'] ?? null) && is_string($doc['name'] ?? null) && self::sameName($doc['name'], $name)) {
                $candidates[$doc['key']] = (int) ($doc['work_count'] ?? 0);
            }
        }

        return $candidates;
    }

    /**
     * Todas as obras de um autor pelas chaves (não pelo nome, que mistura homônimos), as mais
     * queridas primeiro. Cada uma vem com os ISBNs de todas as edições, para conferir com a biblioteca.
     *
     * @param  list<string>  $keys
     * @return list<array{candidate: BookCandidate, isbns: list<string>, portuguese: bool}>
     */
    public function worksByAuthorKeys(array $keys): array
    {
        $keys = array_values(array_filter($keys, fn (string $key) => preg_match('/^OL\d+A$/', $key) === 1));

        if ($keys === []) {
            return [];
        }

        $docs = $this->get('/search.json', [
            'q' => implode(' OR ', array_map(fn (string $key) => "author_key:{$key}", $keys)),
            'sort' => 'want_to_read',
            'fields' => self::SEARCH_FIELDS.',language',
            'limit' => 100,
        ])['docs'] ?? [];

        $works = [];

        foreach (is_array($docs) ? $docs : [] as $doc) {
            if (! is_array($doc) || ! is_string($doc['title'] ?? null)) {
                continue;
            }

            $isbns = array_values(array_filter(array_map(
                fn (mixed $isbn) => is_string($isbn) ? Isbn::toIsbn13($isbn) : null,
                is_array($doc['isbn'] ?? null) ? $doc['isbn'] : [],
            )));
            $isbn13 = $this->pickIsbn($isbns);
            $coverId = BookCandidate::positiveInt($doc['cover_i'] ?? null);

            $works[] = [
                'candidate' => new BookCandidate(
                    title: $doc['title'],
                    source: BookSource::OpenLibrary,
                    isbn13: $isbn13,
                    subtitle: BookCandidate::nonEmptyString($doc['subtitle'] ?? null),
                    authors: BookCandidate::uniqueAuthors(is_array($doc['author_name'] ?? null) ? $doc['author_name'] : []),
                    publishedYear: BookCandidate::yearFrom($doc['first_publish_year'] ?? null),
                    coverUrl: $coverId ? "https://covers.openlibrary.org/b/id/{$coverId}-L.jpg" : null,
                    workKey: self::workKey($doc['key'] ?? null),
                    editionCount: BookCandidate::positiveInt($doc['edition_count'] ?? null),
                    popularity: (int) ($doc['want_to_read_count'] ?? 0) + 5 * (int) ($doc['ratings_count'] ?? 0),
                ),
                'isbns' => $isbns,
                'portuguese' => in_array('por', is_array($doc['language'] ?? null) ? $doc['language'] : [], true),
            ];
        }

        return $works;
    }

    /** Nome igual ou muito parecido (grafias de língua diferente: Tolstói / Tolstoy). */
    private static function similarName(string $a, string $b): bool
    {
        if (self::sameName($a, $b)) {
            return true;
        }

        similar_text(BookIdentity::normalize($a), BookIdentity::normalize($b), $percent);

        return $percent >= 80;
    }

    /** Mesmo nome, ignorando acento, caixa, pontuação e sufixos como "Jr." e "Júnior". */
    private static function sameName(string $a, string $b): bool
    {
        $strip = fn (string $name) => trim((string) preg_replace('/\b(jr|junior|filho|neto|sobrinho)\b/', '', BookIdentity::normalize($name)));

        return $strip($a) === $strip($b) && $strip($a) !== '';
    }

    /**
     * @param  array<string, string|int>  $query
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
                genre: Genres::fromSubjects(is_array($doc['subject'] ?? null) ? $doc['subject'] : []),
                coverUrl: $coverId ? "https://covers.openlibrary.org/b/id/{$coverId}-L.jpg" : null,
                editionCount: BookCandidate::positiveInt($doc['edition_count'] ?? null),
                popularity: (int) ($doc['want_to_read_count'] ?? 0) + 5 * (int) ($doc['ratings_count'] ?? 0),
            );
        }

        return $candidates;
    }

    private function client(): PendingRequest
    {
        return Http::baseUrl('https://openlibrary.org')
            ->withUserAgent(config('services.open_library.user_agent'))
            ->acceptJson()
            ->connectTimeout(4)
            ->timeout(8);
    }
}
