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
use App\Services\BookLookup\BrasilApiProvider;
use App\Services\BookLookup\OpenLibraryProvider;
use App\Services\Recommendation\CandidateRanker;
use App\Services\Recommendation\GenericSubjects;
use App\Services\Recommendation\ScoredRanker;
use App\Services\Recommendation\Suggestion;
use App\Support\BookIdentity;
use App\Support\Genres;
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
 * Só entram obras com edição brasileira (ISBN 978-85/65, confirmada por ISBN para trazer
 * o título em português). O mesmo candidato apontado por vários livros seus sobe na lista,
 * e a popularidade na Open Library separa o conhecido do obscuro.
 *
 * Limites: no máximo MAX_SOURCES livros por busca (no máximo duas chamadas por livro,
 * com timeout de 10s cada). Cada consulta fica em cache por 7 dias; respostas vazias
 * ou com erro não são guardadas, para tentar de novo depois.
 */
class RecommendationService
{
    /** Quantos livros avaliados viram origem numa busca. */
    private const MAX_SOURCES = 6;

    /** Tempo máximo de uma busca, em segundos: passou disso, fica com o que já achou. */
    private const BUDGET_SECONDS = 20;

    /** Quantas sugestões novas uma busca acrescenta. */
    private const MAX_NEW = 20;

    private const CACHE_DAYS = 7;

    /** Want-to-read + 5 × avaliações na Open Library: abaixo disso, obra pouco conhecida. */
    private const MIN_SUBJECT_POPULARITY = 40;

    private const TODAY_KEY = 'suggestion-of-day';

    /** Quantas buscas já foram feitas: a cada uma, a Open Library é lida numa página diferente. */
    private const ROUND_KEY = 'suggestion-round';

    /** Quantas páginas de resultados por assunto se alternam antes de recomeçar. */
    private const PAGES = 3;

    /** Pendentes guardadas: acima disso as mais antigas saem. */
    private const MAX_PENDING = 60;

    /** Página da Open Library desta busca. */
    private int $page = 1;

    public function __construct(
        private readonly OpenLibraryProvider $openLibrary,
        private readonly BrasilApiProvider $brasilApi,
        private readonly BookLookupService $lookup,
        private readonly LibraryService $library,
        private readonly CandidateRanker $ranker = new ScoredRanker,
    ) {}

    /** Há livros avaliados com 4 ou 5 para gerar sugestões? */
    public function hasSources(): bool
    {
        return $this->sourceReadings()->exists();
    }

    /**
     * Busca sugestões novas e devolve quantas foram criadas, acrescentando às pendentes.
     * Cada busca sorteia de novo os livros de origem e lê outra página da Open Library,
     * para não devolver sempre as mesmas.
     */
    public function generate(): int
    {
        $deadline = microtime(true) + self::BUDGET_SECONDS;
        $round = (int) Setting::get(self::ROUND_KEY, 0);
        $this->page = $round % self::PAGES + 1;
        $blocked = $this->blockedKeys();
        /** @var array<int, Suggestion> $found */
        $found = [];
        /** @var array<string, int> $index chave de identidade → posição em $found */
        $index = [];

        foreach ($this->sourceBooks() as [$book, $weight]) {
            // As buscas vão à rede: no estouro do tempo, segue com o que já veio (ao menos um livro).
            if ($found !== [] && microtime(true) > $deadline) {
                break;
            }

            foreach ($this->candidatesFor($book) as $suggestion) {
                $keys = $this->keysOf($suggestion->candidate);

                if (array_intersect_key(array_flip($keys), $blocked) !== []) {
                    continue;
                }

                $position = null;

                foreach ($keys as $key) {
                    $position ??= $index[$key] ?? null;
                }

                $current = $position === null ? null : $found[$position];

                if ($current === null || ($current->kind === Suggestion::BY_SUBJECT && $suggestion->kind === Suggestion::BY_AUTHOR)) {
                    // Novo, ou o mesmo autor substitui um motivo só de assunto: o motivo mais forte vale.
                    $position ??= count($found);
                    $found[$position] = new Suggestion($suggestion->candidate, $suggestion->reason, $book, $suggestion->kind, $weight);
                } elseif ($current->kind === $suggestion->kind && ! in_array($book->id, array_map(fn (Book $b) => $b->id, [$current->basedOn, ...$current->also]), true)) {
                    $found[$position] = $current->withSource($book, $weight);
                }

                foreach ($keys as $key) {
                    $index[$key] = $position;
                }
            }
        }

        $created = [];

        foreach ($this->ranker->rank(array_values($found)) as $attempt => $suggestion) {
            if (count($created) >= self::MAX_NEW || $attempt >= self::MAX_NEW * 2 || microtime(true) > $deadline) {
                break;
            }

            $verified = $this->inPortuguese($suggestion);

            if ($verified === null) {
                continue;
            }

            $keys = $this->keysOf($verified->candidate);

            // O título em português pode ser um livro que você já tem com outro ISBN.
            if (array_intersect_key(array_flip($keys), $blocked) !== []) {
                continue;
            }

            foreach ($keys as $key) {
                $blocked[$key] = true;
            }

            $created[] = $verified;
        }

        // Nada novo nesta página: a próxima busca já lê outra.
        if ($created === []) {
            Setting::put(self::ROUND_KEY, $round + 1);

            return 0;
        }

        foreach ($created as $suggestion) {
            Recommendation::create([
                'title' => $suggestion->candidate->title,
                'author' => $suggestion->candidate->authors === [] ? null : implode(', ', $suggestion->candidate->authors),
                'isbn_13' => $suggestion->candidate->isbn13,
                'cover_url' => $suggestion->candidate->coverUrl,
                'work_key' => $suggestion->candidate->workKey,
                'reason' => $suggestion->reason,
                'based_on_book_id' => $suggestion->basedOn->id,
                'status' => RecommendationStatus::New,
            ]);
        }

        Setting::put(self::ROUND_KEY, $round + 1);
        $this->trimPending();

        return count($created);
    }

    /** Guarda só as pendentes mais recentes. */
    private function trimPending(): void
    {
        $keep = Recommendation::query()->where('status', RecommendationStatus::New)->latest('id')->limit(self::MAX_PENDING)->pluck('id');

        Recommendation::query()->where('status', RecommendationStatus::New)->whereNotIn('id', $keep)->delete();
    }

    /**
     * A obra da Open Library vem com o título original ("The Hobbit"). A edição brasileira,
     * buscada pelo ISBN, traz título, autores e capa em português; sem ela, não sugere.
     */
    private function inPortuguese(Suggestion $suggestion): ?Suggestion
    {
        $isbn = $suggestion->candidate->isbn13;

        if ($isbn === null) {
            return null;
        }

        $edition = $this->brazilianEdition($isbn);

        if ($edition === null || $edition->title === '') {
            return null;
        }

        $candidate = $edition->fillFrom($suggestion->candidate);

        // Autor e título vêm da edição; a capa da obra é só reserva.
        return $suggestion->withCandidate($candidate, $this->reasonFor($suggestion));
    }

    /**
     * Edição pelo ISBN brasileiro: BrasilAPI primeiro (uma chamada, título certo) e, se ela
     * não conhece, as outras fontes. Cada ISBN fica em cache.
     */
    private function brazilianEdition(string $isbn): ?BookCandidate
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

    /** "mesmo autor que A e B" / "assunto em comum: Fantasia, como A e B". */
    private function reasonFor(Suggestion $suggestion): string
    {
        $titles = array_map(fn (Book $book) => $book->title, [$suggestion->basedOn, ...$suggestion->also]);
        $last = array_pop($titles);
        $list = $titles === [] ? $last : implode(', ', $titles).' e '.$last;

        return $suggestion->kind === Suggestion::BY_AUTHOR
            ? "mesmo autor que {$list}"
            : "assunto em comum: {$suggestion->basedOn->genre}, como {$list}";
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

    /**
     * Edições da obra sugerida, brasileiras primeiro, para escolher qual ler.
     *
     * @return list<BookCandidate>
     */
    public function editions(Recommendation $recommendation): array
    {
        // Sugestões antigas não guardaram a obra: acha pelo ISBN e guarda para a próxima.
        if ($recommendation->work_key === null && $recommendation->isbn_13 !== null) {
            $key = $this->openLibrary->workKeyForIsbn($recommendation->isbn_13);

            if ($key !== null) {
                $recommendation->update(['work_key' => $key]);
            }
        }

        if ($recommendation->work_key === null) {
            return [];
        }

        return $this->lookup->editions($recommendation->work_key, $this->authorList($recommendation->author));
    }

    /**
     * "Quero ler": cria o livro na estante "quero ler" e fecha a sugestão.
     * Com `$isbn`, cria a edição escolhida em vez da sugerida.
     */
    public function accept(Recommendation $recommendation, ?string $isbn = null): bool
    {
        $added = $this->addToLibrary($recommendation, ReadingStatus::WantToRead, $isbn);

        $recommendation->update(['status' => RecommendationStatus::WantToRead]);

        return $added;
    }

    /**
     * "Já li": cria o livro como lido. A sugestão é encerrada como descartada, que basta
     * para não voltar (o livro agora também está no acervo).
     */
    public function alreadyRead(Recommendation $recommendation, ?string $isbn = null): bool
    {
        $added = $this->addToLibrary($recommendation, ReadingStatus::Read, $isbn);

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

                $suggestions[] = new Suggestion($candidate, "mesmo autor que {$book->title}", $book, Suggestion::BY_AUTHOR);
            }
        }

        // Os gêneros do catálogo são em português; a Open Library indexa os assuntos em inglês.
        $subject = Genres::openLibrarySubject($book->genre) ?? $book->genre;

        if (GenericSubjects::isUseful($subject) && $subject !== null) {
            $candidates = $this->cachedCandidates(
                'subject:'.BookIdentity::normalize($subject).':p'.$this->page,
                fn () => $this->openLibrary->searchBySubject($subject, $this->page),
            );

            foreach ($candidates as $candidate) {
                if ($this->isUsable($candidate) && $this->fitsSubject($candidate, $book)) {
                    $suggestions[] = new Suggestion($candidate, "assunto em comum: {$book->genre}", $book, Suggestion::BY_SUBJECT);
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

    /**
     * Livros de origem com o peso da nota: 5 estrelas contam mais que 4.
     *
     * @return Collection<int, array{0: Book, 1: float}>
     */
    private function sourceBooks(): Collection
    {
        return $this->sourceReadings()
            ->with('book.authors')
            ->inRandomOrder()
            ->limit(self::MAX_SOURCES)
            ->get()
            ->map(fn (Reading $reading) => [$reading->book, $reading->rating === 5 ? 1.0 : 0.7]);
    }

    /**
     * Edição brasileira para buscar em português, e título que não seja só o nome de um autor.
     * Busca por assunto traz de tudo: exige mesmo gênero (ou nenhum gênero conhecido no
     * livro de origem), capa e alguma popularidade, para não sugerir obra obscura.
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

    private function fitsSubject(BookCandidate $candidate, Book $book): bool
    {
        if ($candidate->coverUrl === null || ($candidate->popularity ?? 0) < self::MIN_SUBJECT_POPULARITY) {
            return false;
        }

        // Sem gênero conhecido na obra não dá para saber se é parecida.
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

    /**
     * Guarda a resposta da API em cache, mas nunca uma lista vazia (pode ser erro de rede).
     *
     * @param  Closure(): list<BookCandidate>  $fetch
     * @return list<BookCandidate>
     */
    private function cachedCandidates(string $key, Closure $fetch): array
    {
        $key = 'suggestions:v2:'.$key;

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
     * (pendentes e descartadas) e a lista de compras da fase 3.
     *
     * @return array<string, true>
     */
    private function blockedKeys(): array
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
    private function addToLibrary(Recommendation $recommendation, ReadingStatus $status, ?string $isbn = null): bool
    {
        if (array_intersect($this->keysOfRecommendation($recommendation), $this->libraryKeys()) !== []) {
            return false;
        }

        // Edição escolhida: vale o ISBN dela, não o da sugestão.
        $isbn = $isbn !== null ? Isbn::toIsbn13($isbn) : null;

        if ($isbn !== null) {
            if (Book::query()->where('isbn_13', $isbn)->exists()) {
                return false;
            }

            $recommendation->isbn_13 = $isbn;
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
