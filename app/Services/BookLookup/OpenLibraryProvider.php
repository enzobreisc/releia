<?php

namespace App\Services\BookLookup;

use App\Enums\BookSource;
use App\Services\AuthorPhoto\AuthorRecord;
use App\Support\BookIdentity;
use App\Support\Genres;
use App\Support\Isbn;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Main source. The Books API (by ISBN) is legacy per its own documentation, so title search
 * uses the Search API.
 */
class OpenLibraryProvider implements MetadataProvider
{
    private const SEARCH_FIELDS = 'key,title,subtitle,author_name,first_publish_year,isbn,number_of_pages_median,subject,cover_i,edition_count,want_to_read_count,ratings_count';

    /** Suggestions only count works with a Portuguese edition; `sort` brings the most loved first. */
    private const SUGGESTION_LANGUAGE = 'por';

    private const SEARCH_RESULTS_LIMIT = 40;

    /** Popular works have dozens of editions; 200 covers almost all of them in one call. */
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

        // The edition often lacks a page count; the work carries the median across its editions.
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
            // Keeps works with at least one edition from this publisher (accent-insensitive).
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
     * Editions of a work. Editions carry author references but not names, so the caller
     * fills in the work's authors.
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

    /** Work key (e.g. "OL1003040W") that an ISBN belongs to, or null when Open Library does not know the edition. */
    public function workKeyForIsbn(string $isbn13): ?string
    {
        $doc = $this->get('/search.json', ['isbn' => $isbn13, 'fields' => 'key', 'limit' => 1])['docs'][0] ?? null;

        return is_array($doc) ? self::workKey($doc['key'] ?? null) : null;
    }

    public static function workKey(mixed $key): ?string
    {
        return is_string($key) && preg_match('#^/works/(OL\d+W)$#', $key, $match) ? $match[1] : null;
    }

    /**
     * Searches return works with the ISBNs of all their editions.
     * Prefers a Brazilian edition; otherwise the first valid ISBN.
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
     * Works by an author, looked up by name. Used by suggestions; the author search also
     * returns works by co-authors, which callers filter out.
     *
     * @return list<BookCandidate>
     */
    public function searchByAuthor(string $author, int $page = 1): array
    {
        return $this->searchDocs(['author' => $author, 'language' => self::SUGGESTION_LANGUAGE, 'sort' => 'want_to_read', 'page' => $page], 20);
    }

    /**
     * Works by author, subject ("Russian literature") or title, most relevant first, in any language
     * or only those with an edition in the given language. Title weighs less, so author and subject rank first.
     *
     * @return list<BookCandidate>
     */
    public function searchWorks(string $text, ?string $language = null): array
    {
        $term = trim(preg_replace('/[^\p{L}\p{N}\s\'-]+/u', ' ', $text) ?? '');

        if ($term === '') {
            return [];
        }

        return $this->searchDocs(array_filter([
            'q' => "author:({$term}) OR subject:({$term}) OR title:({$term})^0.3",
            'language' => $language,
        ]), self::SEARCH_RESULTS_LIMIT);
    }

    /**
     * Works with a subject. Generic subjects such as "Fiction" return thousands of results.
     *
     * @return list<BookCandidate>
     */
    public function searchBySubject(string $subject, int $page = 1): array
    {
        return $this->searchDocs(['subject' => $subject, 'language' => self::SUGGESTION_LANGUAGE, 'sort' => 'want_to_read', 'page' => $page], 30);
    }

    /**
     * Author keys in Open Library from one of the author's books. Open Library often registers the
     * same author more than once ("Júnior" and "Junior"); the ISBN search returns `author_name` and
     * `author_key` in the same order, so the name picks the keys.
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
     * Same as above, but by book title, for editions Open Library does not have by ISBN.
     * Only a work with the same title (no subtitle or parentheses) and a similar author name counts:
     * an equal title is not enough, since another book may share it.
     *
     * @return list<string>
     */
    public function authorKeysForTitle(string $title, string $name): array
    {
        // Text after a period is a subtitle and is ignored, e.g. "O Tatuador de Auschwitz. Baseado na história real…".
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
     * @param  array<mixed>  $doc  with `author_name` and `author_key` in the same order
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

        // No shortcut for a single listed author: Open Library sometimes lists the translator in its place.
        return $keys;
    }

    /**
     * Author keys by name, only when there is no doubt: a single author with that name, or one
     * clearly more famous (3× more works). In that case duplicate records with the same name come
     * too. Look-alike namesakes return an empty list.
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
     * All records with exactly this name, with the number of works each has. Callers must confirm
     * with a book in the library, since namesakes may exist.
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
     * All works of an author by keys (not by name, which mixes namesakes), most loved first. Each one
     * comes with the ISBNs of all its editions, to check against the library.
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

    /** Photos and Wikipedia/Wikidata references of an author record, or null if Open Library does not answer. */
    public function authorRecord(string $key): ?AuthorRecord
    {
        if (preg_match('/^OL\d+A$/', $key) !== 1) {
            return null;
        }

        $data = $this->get("/authors/{$key}.json", []);

        if ($data === []) {
            return null;
        }

        $photoIds = array_filter(is_array($data['photos'] ?? null) ? $data['photos'] : [], fn (mixed $id) => is_int($id) && $id > 0);
        $wikidataId = $data['remote_ids']['wikidata'] ?? null;

        return new AuthorRecord(
            key: $key,
            photoUrls: array_values(array_map(fn (int $id) => "https://covers.openlibrary.org/a/id/{$id}-M.jpg", $photoIds)),
            wikidataId: is_string($wikidataId) && preg_match('/^Q\d+$/', $wikidataId) === 1 ? $wikidataId : null,
            wikipediaTitles: $this->wikipediaTitles(is_array($data['links'] ?? null) ? $data['links'] : []),
        );
    }

    /**
     * @param  array<mixed>  $links
     * @return array<string, string>
     */
    private function wikipediaTitles(array $links): array
    {
        $titles = [];

        foreach ($links as $link) {
            $url = is_array($link) ? ($link['url'] ?? null) : null;

            if (is_string($url) && preg_match('#^https?://([a-z]{2})\.wikipedia\.org/wiki/([^?\#]+)#', $url, $match) === 1) {
                $titles += [$match[1] => urldecode($match[2])];
            }
        }

        return $titles;
    }

    /** Same or very similar name, allowing for spellings in different languages (Tolstói / Tolstoy). */
    private static function similarName(string $a, string $b): bool
    {
        if (self::sameName($a, $b)) {
            return true;
        }

        similar_text(BookIdentity::normalize($a), BookIdentity::normalize($b), $percent);

        return $percent >= 80;
    }

    /** Same name, ignoring accents, case, punctuation and suffixes such as "Jr." and "Júnior". */
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
                workKey: self::workKey($doc['key'] ?? null),
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
