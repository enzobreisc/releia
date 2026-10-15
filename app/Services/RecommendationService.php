<?php

namespace App\Services;

use App\Enums\BookSource;
use App\Enums\ReadingStatus;
use App\Enums\RecommendationStatus;
use App\Models\Author;
use App\Models\Book;
use App\Models\Reading;
use App\Models\Recommendation;
use App\Models\Setting;
use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookup\OpenLibraryProvider;
use App\Services\Recommendation\CandidateRanker;
use App\Services\Recommendation\GenericSubjects;
use App\Services\Recommendation\OriginalOrderRanker;
use App\Services\Recommendation\Suggestion;
use App\Support\BookIdentity;
use App\Support\Isbn;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Camada 1 de sugestões: a partir dos livros avaliados com 4 ou 5, busca outros do
 * mesmo autor e do mesmo assunto na Open Library.
 *
 * Quando gerar: só quando o usuário pede (botão "Buscar novas sugestões" ou
 * `php artisan releia:suggestions`). Não há fila nem cron, porque o app é local.
 * Abrir a tela e today() nunca tocam na rede.
 *
 * Limites: no máximo MAX_SOURCES livros por busca (no máximo duas chamadas por livro,
 * com timeout de 10s cada). Cada consulta fica em cache por 7 dias; respostas vazias
 * ou com erro não são guardadas, para tentar de novo depois.
 */
class RecommendationService
{
    /** Quantos livros avaliados viram origem numa busca. */
    private const MAX_SOURCES = 10;

    /** Quantas sugestões novas uma busca acrescenta. */
    private const MAX_NEW = 20;

    private const CACHE_DAYS = 7;

    private const TODAY_KEY = 'suggestion-of-day';

    public function __construct(
        private readonly OpenLibraryProvider $openLibrary,
        private readonly BookLookupService $lookup,
        private readonly LibraryService $library,
        private readonly CandidateRanker $ranker = new OriginalOrderRanker,
    ) {}

    /** Há livros avaliados com 4 ou 5 para gerar sugestões? */
    public function hasSources(): bool
    {
        return $this->sourceReadings()->exists();
    }

    /**
     * Busca sugestões novas e devolve quantas foram criadas.
     */
    public function generate(): int
    {
        $known = $this->knownKeys();
        /** @var list<Suggestion> $found */
        $found = [];

        foreach ($this->sourceBooks() as $book) {
            foreach ($this->candidatesFor($book) as $suggestion) {
                if (count($found) >= self::MAX_NEW) {
                    break 2;
                }

                $keys = $this->keysOf($suggestion->candidate);

                // Dedupe contra o acervo, as sugestões existentes e entre as próprias buscas.
                if (array_intersect_key(array_flip($keys), $known) !== []) {
                    continue;
                }

                foreach ($keys as $key) {
                    $known[$key] = true;
                }

                $found[] = $suggestion;
            }
        }

        foreach ($this->ranker->rank($found) as $suggestion) {
            Recommendation::create([
                'title' => $suggestion->candidate->title,
                'author' => $suggestion->candidate->authors === [] ? null : implode(', ', $suggestion->candidate->authors),
                'isbn_13' => $suggestion->candidate->isbn13,
                'cover_url' => $suggestion->candidate->coverUrl,
                'reason' => $suggestion->reason,
                'based_on_book_id' => $suggestion->basedOn->id,
                'status' => RecommendationStatus::New,
            ]);
        }

        return count($found);
    }

    /**
     * Sugestão do dia: a mesma durante o dia, mesmo que a lista mude. Não busca na rede.
     */
    public function today(): ?Recommendation
    {
        $today = Carbon::today()->toDateString();
        $saved = Setting::get(self::TODAY_KEY);

        $savedId = is_array($saved) && ($saved['date'] ?? null) === $today ? ($saved['id'] ?? null) : null;

        if (is_int($savedId)) {
            $pick = Recommendation::query()
                ->where('status', RecommendationStatus::New)
                ->find($savedId);

            if ($pick !== null) {
                return $pick;
            }
        }

        /** @var Collection<int, Recommendation> $options */
        $options = Recommendation::query()
            ->where('status', RecommendationStatus::New)
            ->orderBy('id')
            ->get();

        if ($options->isEmpty()) {
            return null;
        }

        // crc32 da data: a escolha muda de um dia para o outro, mas não muda no mesmo dia.
        $pick = $options->get(crc32($today) % $options->count());

        if ($pick !== null) {
            Setting::put(self::TODAY_KEY, ['date' => $today, 'id' => $pick->id]);
        }

        return $pick;
    }

    /** "Quero ler": cria o livro na estante "quero ler" e fecha a sugestão. */
    public function accept(Recommendation $recommendation): bool
    {
        $added = $this->addToLibrary($recommendation, ReadingStatus::WantToRead);

        $recommendation->update(['status' => RecommendationStatus::WantToRead]);

        return $added;
    }

    /**
     * "Já li": cria o livro como lido. A sugestão é encerrada como descartada, que basta
     * para não voltar (o livro agora também está no acervo).
     */
    public function alreadyRead(Recommendation $recommendation): bool
    {
        $added = $this->addToLibrary($recommendation, ReadingStatus::Read);

        $recommendation->update(['status' => RecommendationStatus::Dismissed]);

        return $added;
    }

    /** "Sem interesse": nunca mais sugerir este livro. */
    public function dismiss(Recommendation $recommendation): void
    {
        $recommendation->update(['status' => RecommendationStatus::Dismissed]);
    }

    /**
     * Os candidatos de um livro de origem, cada um com o motivo.
     *
     * @return list<Suggestion>
     */
    private function candidatesFor(Book $book): array
    {
        $suggestions = [];

        $author = $book->authors->first()?->name;

        if ($author !== null) {
            $candidates = $this->cachedCandidates(
                'author:'.BookIdentity::normalize($author),
                fn () => $this->openLibrary->searchByAuthor($author),
            );

            foreach ($candidates as $candidate) {
                // A busca por autor também traz obras de coautores e homônimos: só vale se o autor estiver na obra.
                if (! $this->isUsable($candidate) || ! $this->isBy($candidate, $author)) {
                    continue;
                }

                $suggestions[] = new Suggestion($candidate, "mesmo autor que {$book->title}", $book);
            }
        }

        $subject = $book->genre;

        if (GenericSubjects::isUseful($subject) && $subject !== null) {
            $candidates = $this->cachedCandidates(
                'subject:'.BookIdentity::normalize($subject),
                fn () => $this->openLibrary->searchBySubject($subject),
            );

            foreach ($candidates as $candidate) {
                if ($this->isUsable($candidate)) {
                    $suggestions[] = new Suggestion($candidate, "assunto em comum: {$subject}", $book);
                }
            }
        }

        return $suggestions;
    }

    /**
     * Livros avaliados com 4 ou 5 na leitura mais recente de cada livro (releituras:
     * vale a última passagem, não a primeira).
     *
     * @return Builder<Reading>
     */
    private function sourceReadings(): Builder
    {
        return Reading::query()
            ->whereIn('id', Reading::query()->selectRaw('max(id)')->groupBy('book_id'))
            ->whereIn('rating', [4, 5]);
    }

    /** @return Collection<int, Book> */
    private function sourceBooks(): Collection
    {
        return $this->sourceReadings()
            ->with('book.authors')
            ->latest('id')
            ->limit(self::MAX_SOURCES)
            ->get()
            ->map(fn (Reading $reading) => $reading->book);
    }

    /** Título e autor precisam existir, e o título não pode ser só o nome de um autor. */
    private function isUsable(BookCandidate $candidate): bool
    {
        $title = BookIdentity::normalizeTitle($candidate->title);

        if ($title === '') {
            return false;
        }

        return ! in_array($title, array_map(BookIdentity::normalize(...), $candidate->authors), true);
    }

    private function isBy(BookCandidate $candidate, string $author): bool
    {
        return in_array(
            BookIdentity::normalize($author),
            array_map(BookIdentity::normalize(...), $candidate->authors),
            true,
        );
    }

    /**
     * Guarda a resposta da API em cache, mas nunca uma lista vazia (pode ser erro de rede).
     *
     * @param  Closure(): list<BookCandidate>  $fetch
     * @return list<BookCandidate>
     */
    private function cachedCandidates(string $key, Closure $fetch): array
    {
        $key = 'suggestions:'.$key;

        if (Cache::has($key)) {
            return array_values(array_map(BookCandidate::fromArray(...), Cache::get($key)));
        }

        $candidates = $fetch();

        if ($candidates !== []) {
            Cache::put($key, array_map(fn (BookCandidate $c) => $c->toArray(), $candidates), now()->addDays(self::CACHE_DAYS));
        }

        return $candidates;
    }

    /**
     * Chaves de tudo que não deve voltar como sugestão: acervo, sugestões já feitas
     * (inclusive descartadas) e a lista de compras da fase 3.
     *
     * @return array<string, true>
     */
    private function knownKeys(): array
    {
        $keys = [];

        foreach ([...$this->libraryKeys(), ...$this->recommendationKeys(), ...$this->shoppingKeys()] as $key) {
            $keys[$key] = true;
        }

        return $keys;
    }

    /** @return list<string> */
    private function libraryKeys(): array
    {
        return array_values(Book::query()->with('authors')->get()
            ->flatMap(fn (Book $book) => BookIdentity::keys(
                $book->title,
                array_values($book->authors->map(fn (Author $author) => $author->name)->all()),
                $book->isbn_13,
                $book->isbn_10,
            ))
            ->all());
    }

    /** @return list<string> */
    private function recommendationKeys(): array
    {
        return array_values(Recommendation::query()->get()
            ->flatMap(fn (Recommendation $recommendation) => BookIdentity::keys(
                $recommendation->title,
                $this->authorList($recommendation->author),
                $recommendation->isbn_13,
            ))
            ->all());
    }

    /**
     * Lista de compras (fase 3). Tolerante à ausência da tabela ou das colunas.
     * A fila (queue_items) não entra: ela só guarda livros que já estão no acervo.
     *
     * @return list<string>
     */
    private function shoppingKeys(): array
    {
        if (! Schema::hasTable('shopping_items')) {
            return [];
        }

        $columns = array_values(array_intersect(['title', 'author', 'isbn'], Schema::getColumnListing('shopping_items')));

        if (! in_array('title', $columns, true)) {
            return [];
        }

        $keys = [];

        foreach (DB::table('shopping_items')->get($columns) as $item) {
            $title = (string) $item->title;
            $author = isset($item->author) ? (string) $item->author : null;
            $isbn = isset($item->isbn) ? (string) $item->isbn : null;

            $keys = [...$keys, ...BookIdentity::keys($title, $this->authorList($author), $isbn !== null ? Isbn::toIsbn13($isbn) : null)];
        }

        return $keys;
    }

    /**
     * Chaves de um candidato, para comparar com o acervo e com as sugestões.
     *
     * @return list<string>
     */
    private function keysOf(BookCandidate $candidate): array
    {
        return BookIdentity::keys($candidate->title, $candidate->authors, $candidate->isbn13, $candidate->isbn10);
    }

    /**
     * Cria o livro na biblioteca, com metadados completos quando há ISBN.
     * Se o livro já está no acervo, não cria de novo (o ISBN é único).
     */
    private function addToLibrary(Recommendation $recommendation, ReadingStatus $status): bool
    {
        if (array_intersect($this->keysOfRecommendation($recommendation), $this->libraryKeys()) !== []) {
            return false;
        }

        $candidate = $recommendation->isbn_13 !== null ? $this->lookup->findByIsbn($recommendation->isbn_13) : null;

        $data = $candidate?->toArray() ?? [
            'title' => $recommendation->title,
            'subtitle' => null,
            'authors' => $this->authorList($recommendation->author),
            'isbn_13' => $recommendation->isbn_13,
            'isbn_10' => $recommendation->isbn_13 !== null ? Isbn::toIsbn10($recommendation->isbn_13) : null,
            'publisher' => null,
            'published_year' => null,
            'pages' => null,
            'genre' => null,
            'description' => null,
            'cover_url' => null,
            'source' => BookSource::OpenLibrary->value,
        ];

        $data['cover_url'] ??= $recommendation->cover_url;
        $data['status'] = $status->value;

        $this->library->add($data);

        return true;
    }

    /** @return list<string> */
    private function keysOfRecommendation(Recommendation $recommendation): array
    {
        return BookIdentity::keys(
            $recommendation->title,
            $this->authorList($recommendation->author),
            $recommendation->isbn_13,
        );
    }

    /**
     * Autores guardados como "A, B" voltam a lista.
     *
     * @return list<string>
     */
    private function authorList(?string $author): array
    {
        return $author === null || trim($author) === '' ? [] : array_map(trim(...), explode(',', $author));
    }
}
