import { useState } from 'react';
import { PlusIcon } from '@/components/icons';
import { NoteEditor } from '@/components/note-editor';
import { useTranslation } from '@/hooks/use-translation';
import type { NoteCard } from '@/types/notes';
import type { Option } from '@/types';

/** The book's notes (detail page tab), each opening in the note dialog. */
export function BookNotes({
    bookId,
    notes,
    kinds,
}: {
    bookId: number;
    notes: NoteCard[];
    kinds: Option[];
}) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState<NoteCard | 'new' | null>(null);

    return (
        <div className="flex flex-col gap-2.5 pt-2.5">
            {notes.length === 0 && (
                <p className="py-2 text-sm font-medium text-muted">
                    {t(
                        'Nenhuma nota ainda. Trechos e reflexões sobre este livro aparecem aqui.',
                    )}
                </p>
            )}
            {notes.map((note) => (
                <button
                    key={note.id}
                    type="button"
                    onClick={() => setEditing(note)}
                    className="flex flex-col gap-2 rounded-md bg-surface px-5 py-4 text-left inset-ring inset-ring-border hover:inset-ring-strong"
                >
                    <span className="flex gap-2.5 font-mono text-[11px] text-muted">
                        {note.page && (
                            <span className="text-link">
                                {t('p. :page', { page: note.page })}
                            </span>
                        )}
                        <span>{note.kind_label.toLowerCase()}</span>
                    </span>
                    <span className="line-clamp-3 text-[15px] leading-relaxed font-semibold text-text">
                        {note.body_md}
                    </span>
                </button>
            ))}
            <button
                type="button"
                onClick={() => setEditing('new')}
                className="flex h-10 items-center gap-1.5 self-start rounded-full bg-elevated px-4 text-[13px] font-bold text-text inset-ring inset-ring-strong hover:bg-active"
            >
                <PlusIcon /> {t('Nova nota neste livro')}
            </button>
            {editing !== null && (
                <NoteEditor
                    note={editing === 'new' ? null : editing}
                    bookId={bookId}
                    kinds={kinds}
                    onClose={() => setEditing(null)}
                />
            )}
        </div>
    );
}
