<?php

namespace App\Services;

use App\Models\Note;
use App\Models\Tag;
use Illuminate\Support\Facades\DB;

/** Creates and edits notes, keeping their tags in step with the text. */
class NoteService
{
    /**
     * @param  array{book_id: int, page?: int|null, kind: string, body_md: string}  $data
     */
    public function create(array $data): Note
    {
        return DB::transaction(function () use ($data) {
            $note = Note::create($data);
            $this->syncTags($note);

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
            $this->syncTags($note);

            return $note;
        });
    }

    public function delete(Note $note): void
    {
        $note->delete();
    }

    /**
     * Rebuilds the tags from the text.
     * Public for the note factory, which creates records without going through the service.
     */
    public function syncTags(Note $note): void
    {
        $names = Note::extractTags($note->body_md);
        $ids = array_map(fn (string $name) => Tag::firstOrCreate(['name' => $name])->id, $names);

        $note->tags()->sync($ids);
        $note->unsetRelation('tags');
    }
}
