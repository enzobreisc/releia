<?php

namespace App\Http\Presenters;

use App\Models\Note;

/** Shape of the notes sent to pages. Expects book and tags loaded. */
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
            'updated_at' => $note->updated_at?->toDateString(),
        ];
    }
}
