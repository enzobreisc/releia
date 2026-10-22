import { Link } from '@inertiajs/react';
import { PlusIcon } from '@/components/icons';
import { useTranslation } from '@/hooks/use-translation';
import { index } from '@/routes/notes';
import type { NoteCard } from '@/types/notes';

/** The book's notes (detail page tab) and a shortcut to create another. */
export function BookNotes({
    bookId,
    notes,
}: {
    bookId: number;
    notes: NoteCard[];
}) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-2 pt-2.5">
            {notes.length === 0 && (
                <p className="py-2 text-sm text-muted">
                    {t(
                        'Nenhuma nota ainda. Trechos e reflexões sobre este livro aparecem aqui.',
                    )}
                </p>
            )}
            {notes.map((note) => (
                <Link
                    key={note.id}
                    href={index.url({ query: { note: note.id } })}
                    className="flex flex-col gap-1.5 rounded-md border bg-surface px-3.5 py-3 hover:border-primary"
                >
                    <span className="flex gap-2 font-mono text-[11px] text-muted">
                        {note.page && (
                            <span className="text-accent">
                                {t('p. :page', { page: note.page })}
                            </span>
                        )}
                        <span>{note.kind_label.toLowerCase()}</span>
                    </span>
                    <span className="line-clamp-3 text-sm leading-relaxed text-[#c9d3e3]">
                        {note.body_md}
                    </span>
                </Link>
            ))}
            <Link
                href={index.url({ query: { book: bookId, new: 1 } })}
                className="flex items-center gap-1.5 self-start py-2 text-[13px] font-semibold text-accent hover:underline"
            >
                <PlusIcon /> {t('Nova nota neste livro')}
            </Link>
        </div>
    );
}
