<?php

namespace App\Http\Presenters;

use App\Models\Note;

/** Formato das notas enviado às páginas. Espera book e tags carregados. */
final class NotePresenter
{
    /**
     * @return array<string, mixed>
     */
    public static function card(Note $note): array
    {
        return [
            'id' => $note->id,
            'book_id' => $note->book_id,
            'book_title' => $note->book->title,
            'page' => $note->page,
            'kind' => $note->kind->value,
            'kind_label' => $note->kind->label(),
            'body_md' => $note->body_md,
            'tags' => $note->tags->pluck('name')->sort()->values()->all(),
            'next_review_at' => $note->next_review_at?->toDateString(),
            'review_count' => $note->review_count,
            'updated_at' => $note->updated_at?->toDateString(),
        ];
    }
}
