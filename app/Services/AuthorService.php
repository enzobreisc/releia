<?php

namespace App\Services;

use App\Models\Author;
use App\Models\Book;
use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookup\BrasilApiProvider;
use App\Services\BookLookup\OpenLibraryProvider;
use App\Support\BookIdentity;
use App\Support\Isbn;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Obras de um autor. A identidade vem das chaves da Open Library, não do nome: a chave sai
 * do ISBN de um livro seu (sem ambiguidade) e, só quando não há ISBN, de um nome que não
 * deixa dúvida. Se nenhuma das duas identifica o autor, não mostramos obras (melhor nada
 * que obras de um homônimo).
 */
class AuthorService
{
    private const CACHE_DAYS = 7;

    /** Quantas obras a página resolve para o português (uma ou mais chamadas cada). */
    private const MAX_WORKS = 30;

    /** Edições brasileiras tentadas por obra até uma ter título na BrasilAPI. */
    private const ISBN_TRIES = 3;

    public function __construct(
        private readonly OpenLibraryProvider $openLibrary,
        private readonly BrasilApiProvider $brasilApi,
        private readonly BookLookupService $lookup,
    ) {}

    /**
     * Chaves do autor, guardadas depois da primeira vez. Vazio: não deu para ter certeza.
     *
     * @return list<string>
     */
    public function keys(Author $author): array
    {
        if ($author->open_library_key !== null && $author->open_library_key !== '') {
            return explode(',', $author->open_library_key);
        }

        $keys = $this->keysFromBooks($author);

        if ($keys === []) {
            $keys = $this->openLibrary->authorKeysByName($author->name);
        }

        if ($keys === []) {
            $keys = $this->confirmedByLibrary($author);
        }

        // Falha de rede não pode virar "autor sem identidade" para sempre: só guarda o que achou.
        if ($keys !== []) {
            $author->update(['open_library_key' => implode(',', $keys)]);
        }

        return $keys;
    }

    /**
     * Chaves pelo que o autor escreveu e você tem: ISBN primeiro, título quando a Open Library
     * não conhece a edição. O livro é a âncora, então homônimos não entram.
     *
     * @return list<string>
     */
    private function keysFromBooks(Author $author): array
    {
        $books = $author->books()->limit(5)->get(['books.id', 'title', 'isbn_13']);

        foreach ($books as $book) {
            $isbnKeys = $book->isbn_13 !== null ? $this->openLibrary->authorKeysForIsbn($book->isbn_13, $author->name) : [];

            // The ISBN may be listed under a misspelled duplicate of the author ("Machado de Assís"),
            // so the title search adds the main record.
            $keys = array_values(array_unique([...$isbnKeys, ...$this->openLibrary->authorKeysForTitle($book->title, $author->name)]));

            if ($keys !== []) {
                return $keys;
            }
        }

        return [];
    }

    /**
     * Último recurso: cadastros com exatamente o nome do autor (comum em autores famosos, que a
     * Open Library duplica). Só vale se algum livro seu aparece nas obras deles, por ISBN.
     *
     * @return list<string>
     */
    private function confirmedByLibrary(Author $author): array
    {
        $candidates = array_keys(array_filter($this->openLibrary->authorKeyCandidatesByName($author->name), fn (int $count) => $count >= 5));

        if ($candidates === []) {
            return [];
        }

        $owned = $this->ownedKeys(collect([$author]));

        foreach ($this->openLibrary->worksByAuthorKeys($candidates) as $work) {
            $keys = [...array_map(fn (string $isbn) => 'isbn:'.$isbn, $work['isbns']), 'title:'.BookIdentity::normalizeTitle($work['candidate']->title)];

            if (array_intersect($keys, $owned) !== []) {
                return $candidates;
            }
        }

        return [];
    }

    /**
     * Autores da biblioteca que são a mesma pessoa (mesma chave), contando o próprio.
     *
     * @return Collection<int, Author>
     */
    public function sameAuthors(Author $author): Collection
    {
        $keys = $author->open_library_key === null ? [] : explode(',', $author->open_library_key);

        return Author::query()
            ->where('id', $author->id)
            ->when($keys !== [], function ($query) use ($keys) {
                foreach ($keys as $key) {
                    $query->orWhere('open_library_key', 'like', "%{$key}%");
                }
            })
            ->get();
    }

    /**
     * Obras do autor que ainda não estão na biblioteca, as mais queridas primeiro.
     *
     * @return array{verified: bool, items: list<array<string, mixed>>}
     */
    public function works(Author $author): array
    {
        $keys = $this->keys($author);

        if ($keys === []) {
            return ['verified' => false, 'items' => []];
        }

        $works = $this->cachedWorks($keys);

        $owned = $this->ownedKeys($this->sameAuthors($author));
        $seen = [];
        $items = [];

        foreach ($works as $work) {
            if (count($items) >= self::MAX_WORKS) {
                break;
            }

            // A Open Library lista traduções como obras à parte: só vale a que tem edição brasileira.
            $brazilian = array_values(array_filter($work['isbns'], Isbn::isBrazilian(...)));

            if (! $work['portuguese'] || $brazilian === []) {
                continue;
            }

            $original = BookIdentity::normalizeTitle($work['candidate']->title);

            if (array_intersect(['title:'.$original, ...array_map(fn (string $isbn) => 'isbn:'.$isbn, $work['isbns'])], $owned) !== []) {
                continue;
            }

            $edition = $this->portugueseEdition($brazilian);

            if ($edition === null) {
                continue;
            }

            $title = BookIdentity::normalizeTitle($edition->title);

            // Sem título, título que é o nome do autor, repetido (mesma obra em edições diferentes) ou já na biblioteca.
            if ($title === '' || isset($seen[$title]) || in_array('title:'.$title, $owned, true) || in_array($title, array_map(BookIdentity::normalize(...), $work['candidate']->authors), true)) {
                continue;
            }

            $seen[$title] = true;
            $items[] = [
                'title' => $edition->title,
                'year' => $work['candidate']->publishedYear ?? $edition->publishedYear,
                'cover_url' => $edition->coverUrl ?? $work['candidate']->coverUrl,
                'work_key' => $work['candidate']->workKey,
                'edition_count' => $work['candidate']->editionCount,
                'portuguese' => true,
                'isbn_13' => $edition->isbn13,
            ];
        }

        return ['verified' => true, 'items' => $items];
    }

    /**
     * Cached as plain arrays: the cache does not unserialize objects (`cache.serializable_classes`),
     * so a cached BookCandidate would come back as an incomplete class and break the request.
     *
     * @param  list<string>  $keys
     * @return list<array{candidate: BookCandidate, isbns: list<string>, portuguese: bool}>
     */
    private function cachedWorks(array $keys): array
    {
        $cacheKey = 'author-works:v3:'.implode(',', $keys);
        $cached = Cache::get($cacheKey);

        if (is_array($cached)) {
            return array_values(array_map(fn (array $work) => ['candidate' => BookCandidate::fromArray($work['candidate']), 'isbns' => $work['isbns'], 'portuguese' => $work['portuguese']], $cached));
        }

        $works = $this->openLibrary->worksByAuthorKeys($keys);

        // Empty may be a network failure: do not cache it.
        if ($works !== []) {
            Cache::put($cacheKey, array_map(fn (array $work) => [...$work, 'candidate' => $work['candidate']->toArray()], $works), now()->addDays(self::CACHE_DAYS));
        }

        return $works;
    }

    /**
     * Edição em português pelo ISBN: BrasilAPI primeiro (catálogo brasileiro, título certo) e,
     * se ela não conhece, as outras fontes.
     *
     * @param  list<string>  $isbns  ISBNs brasileiros da obra
     */
    private function portugueseEdition(array $isbns): ?BookCandidate
    {
        foreach (array_slice($isbns, 0, self::ISBN_TRIES) as $isbn) {
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
        }

        // lookup->findByIsbn guarda o próprio cache.
        return $this->lookup->findByIsbn($isbns[0]);
    }

    /**
     * Chaves do que o usuário já tem desses autores: ISBNs (13 e 10) e títulos.
     *
     * @param  Collection<int, Author>  $authors
     * @return list<string>
     */
    private function ownedKeys(Collection $authors): array
    {
        $keys = [];

        $books = Book::query()
            ->whereHas('authors', fn ($query) => $query->whereIn('authors.id', $authors->pluck('id')))
            ->get(['title', 'isbn_13', 'isbn_10']);

        foreach ($books as $book) {
            $keys[] = 'title:'.BookIdentity::normalizeTitle($book->title);

            foreach ([$book->isbn_13, $book->isbn_10] as $isbn) {
                if ($isbn !== null && $isbn !== '') {
                    $keys[] = 'isbn:'.(Isbn::toIsbn13($isbn) ?? $isbn);
                }
            }
        }

        return array_values(array_unique($keys));
    }
}
