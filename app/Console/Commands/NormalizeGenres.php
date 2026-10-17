<?php

namespace App\Console\Commands;

use App\Models\Book;
use App\Support\Genres;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('releia:normalize-genres {--apply : grava as mudanças; sem isso só mostra}')]
#[Description('Troca os gêneros soltos das fontes pelos gêneros do catálogo')]
class NormalizeGenres extends Command
{
    public function handle(): int
    {
        $changes = [];

        foreach (Book::query()->whereNotNull('genre')->get() as $book) {
            $genre = Genres::fromSubjects([$book->genre]);

            // Sem correspondência o texto fica como está: pode ter sido digitado à mão.
            if ($genre !== null && $genre !== $book->genre) {
                $changes[] = [$book->id, $book->title, $book->genre, $genre];

                if ($this->option('apply')) {
                    $book->update(['genre' => $genre]);
                }
            }
        }

        if ($changes === []) {
            $this->info('Nada para trocar.');

            return self::SUCCESS;
        }

        $this->table(['id', 'título', 'gênero atual', 'novo gênero'], $changes);
        $this->line($this->option('apply') ? 'Gêneros atualizados.' : 'Nada foi gravado. Use --apply para gravar.');

        return self::SUCCESS;
    }
}
