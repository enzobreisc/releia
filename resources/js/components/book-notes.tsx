import { useState } from 'react';
import { cardClass } from '@/components/card';
import { Button } from '@/components/form';
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
        <div className="flex flex-col gap-3.5">
            {notes.length === 0 && (
                <p
                    className={cardClass(
                        'px-5 py-5.5 text-sm font-semibold text-muted',
                    )}
                >
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
                    className={cardClass(
                        'flex flex-col gap-3 p-5.5 text-left hover:inset-ring-strong',
                    )}
                >
                    <span className="flex gap-2.5 font-mono text-xs text-muted">
                        {note.page && (
                            <span className="text-link">
                                {t('p. :page', { page: note.page })}
                            </span>
                        )}
                        <span>{note.kind_label.toLowerCase()}</span>
                    </span>
                    <span className="line-clamp-4 max-w-[60ch] text-xl leading-[1.45] font-semibold tracking-tight text-text">
                        {note.body_md}
                    </span>
                </button>
            ))}
            <Button
                variant="ghost"
                onClick={() => setEditing('new')}
                className="self-start"
            >
                <PlusIcon /> {t('Nova nota neste livro')}
            </Button>
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
