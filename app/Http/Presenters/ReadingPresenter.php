<?php

namespace App\Http\Presenters;

use App\Models\Reading;
use App\Models\ReadingSession;
use App\Services\ReadingService;

/** Formato das leituras e sessões enviado às páginas. */
final class ReadingPresenter
{
    /**
     * Leitura com o progresso já calculado. Espera book com authors carregado.
     *
     * @return array<string, mixed>
     */
    public static function summary(Reading $reading, ReadingService $readings): array
    {
        $book = $reading->book;

        return [
            'reading_id' => $reading->id,
            'book_id' => $book->id,
            'title' => $book->title,
            'authors' => $book->authors->pluck('name')->implode(', '),
            'cover_url' => BookPresenter::coverUrl($book),
            ...$readings->progress($reading),
        ];
    }

    /**
     * Sessão do log. O hash é derivado do id, só para lembrar um commit.
     *
     * @return array<string, mixed>
     */
    public static function session(ReadingSession $session): array
    {
        return [
            'id' => $session->id,
            'hash' => substr(sha1((string) $session->id), 0, 7),
            'read_on' => $session->read_on->toDateString(),
            'page_from' => $session->page_from,
            'page_to' => $session->page_to,
            'pages' => $session->pages(),
            'minutes' => $session->minutes,
        ];
    }
}
