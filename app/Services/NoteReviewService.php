<?php

namespace App\Services;

use App\Models\Note;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Repetição espaçada simples: a nota volta amanhã, depois em 3, 7, 14… dias.
 * A cada revisão feita o intervalo cresce; depois do último valor ele fica fixo.
 */
class NoteReviewService
{
    /** Dias até a próxima revisão, indexados pelo número de revisões já feitas. */
    private const INTERVALS = [1, 3, 7, 14, 30, 60, 120];

    /** Dia da próxima revisão para uma nota que já teve $reviewCount revisões. */
    public function nextReviewDate(int $reviewCount, Carbon $from): Carbon
    {
        $index = min($reviewCount, count(self::INTERVALS) - 1);

        return $from->copy()->startOfDay()->addDays(self::INTERVALS[$index]);
    }

    /**
     * Notas para rever no dia ou atrasadas. Filtra por data (whereDate), porque
     * a coluna pode guardar a hora e a comparação de texto erraria o mesmo dia.
     *
     * @return Builder<Note>
     */
    public function dueOn(Carbon $day): Builder
    {
        return Note::query()->whereDate('next_review_at', '<=', $day->toDateString());
    }

    /** Marca a nota como revista hoje e reagenda pelo próximo intervalo. */
    public function markReviewed(Note $note, Carbon $today): void
    {
        $note->review_count++;
        $note->next_review_at = $this->nextReviewDate($note->review_count, $today);
        $note->save();
    }
}
