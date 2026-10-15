import { Link } from '@inertiajs/react';
import { SectionTitle } from '@/components/page-header';
import { buttonClass } from '@/components/form';
import { PlusIcon } from '@/components/icons';
import { index } from '@/routes/notes';
import type { NoteCard } from '@/types/notes';

/** Seção "## notas" do Detalhe do livro: as notas dele e um atalho para criar outra. */
export function BookNotes({
    bookId,
    notes,
}: {
    bookId: number;
    notes: NoteCard[];
}) {
    return (
        <section className="flex flex-col gap-3.5 rounded-md border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionTitle>notas</SectionTitle>
                <Link
                    href={index.url({ query: { book: bookId, new: 1 } })}
                    className={buttonClass('ghost', 'h-9 px-3 text-[13px]')}
                >
                    <PlusIcon /> Nova nota
                </Link>
            </div>

            {notes.length === 0 ? (
                <p className="text-sm text-muted">
                    Nenhuma nota ainda. Trechos e reflexões sobre este livro
                    aparecem aqui.
                </p>
            ) : (
                <ul className="flex flex-col divide-y">
                    {notes.map((note) => (
                        <li key={note.id}>
                            <Link
                                href={index.url({ query: { note: note.id } })}
                                className="flex flex-col gap-1 py-3 hover:text-accent"
                            >
                                <span className="font-mono text-[11px] text-muted">
                                    {note.kind_label}
                                    {note.page ? ` · p. ${note.page}` : ''}
                                </span>
                                <span className="line-clamp-2 text-sm">
                                    {note.body_md}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
