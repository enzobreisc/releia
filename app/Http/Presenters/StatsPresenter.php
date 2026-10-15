<?php

namespace App\Http\Presenters;

use App\Models\Reading;

/** Formato das estatísticas, do perfil e do Wrapped enviado às páginas. */
final class StatsPresenter
{
    private const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

    /**
     * Leitura com os dados do livro e a nota da própria leitura.
     *
     * @return array<string, mixed>|null
     */
    public static function reading(?Reading $reading): ?array
    {
        if ($reading === null) {
            return null;
        }

        $book = $reading->book;
        $days = $reading->started_at !== null && $reading->finished_at !== null
            ? (int) $reading->started_at->diffInDays($reading->finished_at) + 1
            : null;

        return [
            'id' => $book->id,
            'title' => $book->title,
            'authors' => $book->authors->pluck('name')->implode(', '),
            'genre' => $book->genre,
            'cover_url' => BookPresenter::card($book)['cover_url'],
            'rating' => $reading->rating,
            'pages' => $book->pages,
            'days' => $days,
            'finished_at' => $reading->finished_at?->toDateString(),
        ];
    }

    /** Rótulo do eixo: "mar" para um mês (AAAA-MM), o próprio ano no histórico. */
    public static function bucketLabel(string $key, bool $history): string
    {
        if ($history) {
            return $key;
        }

        return self::MONTHS[((int) substr($key, 5, 2)) - 1];
    }

    /** Nome do mês por extenso, para o Wrapped ("março"). */
    public static function monthName(string $month): string
    {
        return [
            'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
        ][((int) substr($month, 5, 2)) - 1];
    }
}
