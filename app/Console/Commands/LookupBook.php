<?php

namespace App\Console\Commands;

use App\Services\BookLookupService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('releia:lookup {query : ISBN ou título}')]
#[Description('Busca metadados de um livro nas fontes externas, sem salvar')]
class LookupBook extends Command
{
    public function handle(BookLookupService $lookup): int
    {
        $query = $this->argument('query');
        $results = is_string($query) ? $lookup->search($query) : [];

        if ($results === []) {
            $this->warn('Nenhum resultado.');

            return self::FAILURE;
        }

        $this->table(
            ['isbn', 'título', 'autores', 'editora', 'ano', 'págs', 'gênero', 'capa', 'fonte'],
            array_map(fn ($book) => [
                $book->isbn13,
                $book->title,
                implode(', ', $book->authors),
                $book->publisher,
                $book->publishedYear,
                $book->pages,
                $book->genre,
                $book->coverUrl ? 'sim' : 'não',
                $book->source->label(),
            ], $results),
        );

        return self::SUCCESS;
    }
}
