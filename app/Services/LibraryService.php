<?php

namespace App\Services;

use App\Enums\BookSource;
use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\Reading;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Entrada e saída de livros da biblioteca. */
class LibraryService
{
    public function __construct(
        private readonly CoverStore $covers,
        private readonly ReadingService $readings,
    ) {}

    /**
     * @param  array{title: string, subtitle?: string|null, authors?: list<string>, isbn_13?: string|null, isbn_10?: string|null, publisher?: string|null, published_year?: int|null, pages?: int|null, genre?: string|null, description?: string|null, cover_url?: string|null, source?: string|null, status: string, finished_on?: string|null, undated?: bool}  $data
     */
    public function add(array $data): Book
    {
        $book = DB::transaction(function () use ($data) {
            $book = Book::create([
                'title' => $data['title'],
                'subtitle' => $data['subtitle'] ?? null,
                'isbn_13' => $data['isbn_13'] ?? null,
                'isbn_10' => $data['isbn_10'] ?? null,
                'publisher' => $data['publisher'] ?? null,
                'published_year' => $data['published_year'] ?? null,
                'pages' => $data['pages'] ?? null,
                'genre' => $data['genre'] ?? null,
                'description' => $data['description'] ?? null,
                'source' => BookSource::tryFrom($data['source'] ?? '') ?? BookSource::Manual,
            ]);

            $book->syncAuthors($data['authors'] ?? []);
            $book->refreshSearchText();

            $reading = new Reading(['status' => ReadingStatus::WantToRead]);
            $reading->book()->associate($book);
            $this->readings->changeStatus($reading, ReadingStatus::from($data['status']));

            // Livro lido antes do app: a data informada vale para início e fim (não há sessões).
            if ($reading->status === ReadingStatus::Read && ! empty($data['undated'])) {
                $reading->started_at = $reading->finished_at = null;
                $reading->save();
            } elseif ($reading->status === ReadingStatus::Read && ! empty($data['finished_on'])) {
                $reading->started_at = $reading->finished_at = Carbon::parse($data['finished_on']);
                $reading->save();
            }

            return $book;
        });

        // Fora da transação: a capa é opcional e uma falha não desfaz o cadastro.
        $coverUrl = ! empty($data['cover_url']) ? $data['cover_url'] : null;

        if ($coverUrl !== null && $this->covers->download($book, $coverUrl)) {
            return $book;
        }

        // Sem link, ou o link não rendeu imagem: tenta pelo ISBN.
        $fallback = $book->isbn_13 ? $this->covers->findByIsbn($book->isbn_13) : null;

        if ($fallback !== null) {
            $this->covers->download($book, $fallback);
        }

        return $book;
    }

    /**
     * Corrige os dados do livro. Capa nova (arquivo ou link) só é trocada se vier.
     * Devolve true se a capa mudou, porque essa troca não tem desfazer.
     *
     * @param  array{title: string, subtitle?: string|null, authors?: list<string>, isbn_13?: string|null, isbn_10?: string|null, publisher?: string|null, published_year?: int|null, pages?: int|null, genre?: string|null, description?: string|null}  $data
     */
    public function update(Book $book, array $data, ?UploadedFile $coverFile = null, ?string $coverUrl = null): bool
    {
        DB::transaction(function () use ($book, $data) {
            $book->update([
                'title' => $data['title'],
                'subtitle' => $data['subtitle'] ?? null,
                'isbn_13' => $data['isbn_13'] ?? null,
                'isbn_10' => $data['isbn_10'] ?? null,
                'publisher' => $data['publisher'] ?? null,
                'published_year' => $data['published_year'] ?? null,
                'pages' => $data['pages'] ?? null,
                'genre' => $data['genre'] ?? null,
                'description' => $data['description'] ?? null,
            ]);

            $book->syncAuthors($data['authors'] ?? []);
            $book->refreshSearchText();

            // Total menor que a página marcada sem sessão (ex.: "lido" manual): a página acompanha.
            if ($book->pages !== null) {
                $book->readings()->where('current_page', '>', $book->pages)->update(['current_page' => $book->pages]);
            }
        });

        if ($coverFile !== null) {
            return $this->covers->store($book, $coverFile);
        }

        if ($coverUrl !== null && $coverUrl !== '') {
            return $this->covers->download($book, $coverUrl);
        }

        return false;
    }

    public function remove(Book $book): void
    {
        $this->covers->delete($book);
        $book->delete();
    }
}
