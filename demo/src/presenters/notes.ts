import type { NoteCard } from '@/types/notes';
import type { NoteRow } from '../state/types';
import { bookOf } from '../domain/books';
import { tagNamesOf } from '../domain/notes';
import type { ReadModel } from '../domain/read-model';
import { nullableDayOf } from '../support/day';
import { noteKindLabel } from '../support/labels';

/** NotePresenter::card: tags are sorted by name, as the app sorts them. */
export function noteCard(model: ReadModel, note: NoteRow): NoteCard {
    return {
        id: note.id,
        book_id: note.book_id,
        book_title: bookOf(model, note.book_id).title,
        page: note.page,
        kind: note.kind,
        kind_label: noteKindLabel(model.locale, note.kind),
        body_md: note.body_md,
        tags: [...tagNamesOf(model, note.id)].sort(),
        updated_at: nullableDayOf(note.updated_at),
    };
}
