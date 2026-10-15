<?php

namespace App\Services;

use App\Models\Book;
use App\Models\Note;
use App\Models\Tag;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Criação e edição de notas, com as tags e o texto de busca sempre em dia. */
class NoteService
{
    public function __construct(private readonly NoteReviewService $reviews) {}

    /**
     * @param  array{book_id: int, page?: int|null, kind: string, body_md: string}  $data
     */
    public function create(array $data): Note
    {
        return DB::transaction(function () use ($data) {
            // Nova nota entra na revisão do dia seguinte, sem nenhuma revisão feita ainda.
            $note = Note::create([
                ...$data,
                'next_review_at' => $this->reviews->nextReviewDate(0, Carbon::today()),
            ]);

            $this->refreshDerived($note);

            return $note;
        });
    }

    /**
     * @param  array{book_id: int, page?: int|null, kind: string, body_md: string}  $data
     */
    public function update(Note $note, array $data): Note
    {
        return DB::transaction(function () use ($note, $data) {
            $note->update($data);
            $this->refreshDerived($note);

            return $note;
        });
    }

    public function delete(Note $note): void
    {
        $note->delete();
    }

    /**
     * Recalcula as tags a partir do texto e o texto de busca a partir do corpo e das tags.
     * Público para a factory de notas, que cria registros sem passar pelo serviço.
     */
    public function refreshDerived(Note $note): void
    {
        $names = Note::extractTags($note->body_md);
        $ids = array_map(fn (string $name) => Tag::firstOrCreate(['name' => $name])->id, $names);

        $note->tags()->sync($ids);
        $note->unsetRelation('tags');

        $note->search_text = Book::normalizeSearch(implode(' ', [$note->body_md, ...$names]));
        $note->save();
    }
}
