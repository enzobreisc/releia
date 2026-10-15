<?php

namespace Database\Seeders;

use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\Reading;
use App\Models\Setting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Biblioteca de demonstração para ver as telas com dados: livros e sessões espalhados
 * em 2026. Os dados são fixos (sem aleatoriedade), então os números são sempre os mesmos.
 *
 * Uso: php artisan db:seed --class=DemoSeeder
 */
class DemoSeeder extends Seeder
{
    /**
     * Título, autores, páginas, gênero, estante, início, fim, nota.
     *
     * @var list<array{0: string, 1: list<string>, 2: int, 3: string, 4: string, 5: string|null, 6: string|null, 7: int|null}>
     */
    private const BOOKS = [
        ['Torto Arado', ['Itamar Vieira Junior'], 264, 'Romance', 'lido', '2026-01-03', '2026-01-20', 5],
        ['Sapiens', ['Yuval Noah Harari'], 464, 'História', 'lido', '2026-02-01', '2026-03-02', 4],
        ['Clean Code', ['Robert C. Martin'], 431, 'Tecnologia', 'lido', '2026-03-10', '2026-04-08', 4],
        ['Dom Casmurro', ['Machado de Assis'], 256, 'Ficção', 'lido', '2026-04-12', '2026-04-25', 3],
        ['Pequeno Manual Antirracista', ['Djamila Ribeiro'], 128, 'Não ficção', 'lido', '2026-05-01', '2026-05-06', 5],
        ['O Hobbit', ['J. R. R. Tolkien'], 310, 'Fantasia', 'lido', '2026-06-01', '2026-06-16', 4],
        ['Histórias Extraordinárias', ['Edgar Allan Poe'], 220, 'Ficção', 'lido', '2026-07-02', '2026-07-10', 3],
        ['O Alquimista', ['Paulo Coelho'], 208, 'Ficção', 'lido', '2026-08-03', '2026-08-07', 2],
        ['Refactoring', ['Martin Fowler'], 448, 'Tecnologia', 'lendo', '2026-09-01', null, null],
        ['Memórias Póstumas de Brás Cubas', ['Machado de Assis'], 262, 'Ficção', 'lendo', '2026-10-01', null, null],
        ['Ensaio sobre a cegueira', ['José Saramago'], 310, 'Ficção', 'abandonado', '2026-02-10', '2026-02-20', null],
        ['Duna', ['Frank Herbert'], 688, 'Ficção', 'quero_ler', '2026-01-01', null, null],
    ];

    public function run(): void
    {
        foreach (self::BOOKS as [$title, $authors, $pages, $genre, $status, $started, $finished, $rating]) {
            $book = Book::factory()->withAuthors($authors)->create([
                'title' => $title,
                'pages' => $pages,
                'genre' => $genre,
            ]);

            $reading = Reading::factory()->for($book)->create([
                'status' => ReadingStatus::from($status),
                'started_at' => $started,
                'finished_at' => $finished,
                'rating' => $rating,
                'current_page' => $status === 'lido' ? $pages : 0,
            ]);

            $this->addSessions($reading, $status, $pages, $started, $finished);
        }

        Setting::put('yearly_goal', 12);
    }

    /**
     * Sessões a cada dois dias, com as páginas divididas igualmente. Lidos cobrem o livro
     * inteiro; em andamento, parte; abandonados, só o começo.
     */
    private function addSessions(Reading $reading, string $status, int $pages, string $started, ?string $finished): void
    {
        $start = Carbon::parse($started);
        $end = $finished !== null ? Carbon::parse($finished) : Carbon::parse('2026-10-14');

        $target = match ($status) {
            'lido' => $pages,
            'lendo' => 90,
            'abandonado' => 40,
            default => 0,
        };

        if ($target === 0) {
            return;
        }

        $days = [];

        for ($day = $start->copy(); $day->lte($end); $day = $day->addDays(2)) {
            $days[] = $day->toDateString();
        }

        if ($status === 'lido' && end($days) !== $end->toDateString()) {
            $days[] = $end->toDateString();
        }

        $chunk = intdiv($target, count($days));
        $from = 1;

        foreach ($days as $index => $day) {
            $last = $index === count($days) - 1;
            $to = $last ? $from + $chunk + ($target % count($days)) - 1 : $from + $chunk - 1;

            $reading->sessions()->create([
                'read_on' => $day,
                'page_from' => $from,
                'page_to' => max($from, $to),
                'minutes' => null,
            ]);

            $from = $to + 1;
        }
    }
}
