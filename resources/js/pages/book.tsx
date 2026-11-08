import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { BookEditor } from '@/components/book-editor';
import { BookDialogs } from '@/components/book/book-dialogs';
import { BookHeader } from '@/components/book/book-header';
import { BookTabs } from '@/components/book/book-tabs';
import type { BookTab } from '@/components/book/book-tabs';
import { ClosedCard } from '@/components/book/closed-card';
import { FIRST_READING_NUMBER } from '@/components/book/constants';
import { Description } from '@/components/book/description';
import { PlannedReadingCard } from '@/components/book/planned-reading-card';
import { ProgressCard } from '@/components/book/progress-card';
import { ReadingsSection } from '@/components/book/readings-section';
import type { Removal } from '@/components/reading-dialogs';
import type { Status } from '@/components/status';
import { useBookDialogs } from '@/hooks/use-book-dialogs';
import { useTranslation } from '@/hooks/use-translation';
import { index as libraryIndex } from '@/routes/library';
import type {
    Candidate,
    BookDetail,
    Option,
    ReadingHistory,
    ReadingProgress,
    ReadingSession,
} from '@/types';
import type { NoteCard } from '@/types/notes';

type BookProps = {
    book: BookDetail;
    slug: string;
    progress: ReadingProgress | null;
    sessions: ReadingSession[];
    can_log: boolean;
    readings: ReadingHistory[];
    notes: NoteCard[];
    note_kinds: Option[];
    queue_position: number | null;
    removal: Removal;
    genres: string[];
    lookup?: Candidate | null;
};

export default function Book({
    book,
    progress,
    sessions,
    can_log,
    readings,
    notes,
    note_kinds,
    queue_position,
    removal,
    genres,
    lookup,
}: BookProps) {
    const { t, plural } = useTranslation();
    const status = (book.reading?.status ?? 'want_to_read') as Status;
    const current = readings.at(-1) ?? null;
    const previous =
        readings
            .slice(0, -1)
            .filter((item) => item.status === 'read')
            .at(-1) ?? null;
    const number = current?.number ?? FIRST_READING_NUMBER;
    const canMoveToShopping =
        status === 'want_to_read' &&
        readings.length <= 1 &&
        sessions.length === 0 &&
        notes.length === 0;
    const [tab, setTab] = useState<BookTab>(
        status === 'read' ? 'review' : 'sessions',
    );
    const {
        dialog,
        openDialog,
        closeDialog,
        isEditing,
        startEditing,
        stopEditing,
    } = useBookDialogs();

    return (
        <div className="flex max-w-270 flex-col gap-12">
            <Head title={book.title} />
            <div className="flex flex-wrap justify-between gap-3 text-[13px] font-semibold text-muted">
                <span>
                    <Link
                        href={libraryIndex.url()}
                        className="text-secondary hover:text-text"
                    >
                        {t('Biblioteca')}
                    </Link>{' '}
                    <span aria-hidden="true">/</span>{' '}
                    <span className="text-text">{book.title}</span>
                </span>
                <span className="font-mono text-[11px]">{t('⌘E edita')}</span>
            </div>

            <BookHeader
                book={book}
                status={status}
                current={current}
                previous={previous}
                queuePosition={queue_position}
                canMoveToShopping={canMoveToShopping}
                onOpenDialog={openDialog}
                onEdit={startEditing}
            />

            {book.description && <Description text={book.description} />}

            {status === 'want_to_read' && (
                <PlannedReadingCard
                    number={number}
                    progress={progress}
                    queuePosition={queue_position}
                />
            )}

            {status === 'reading' && progress && current && (
                <ProgressCard
                    bookId={book.id}
                    reading={current}
                    progress={progress}
                    canLog={can_log}
                    onFinish={() => openDialog({ kind: 'finish' })}
                    onEditDates={() =>
                        openDialog({ kind: 'dates', reading: current })
                    }
                />
            )}

            {status === 'read' && current && (
                <ClosedCard
                    tone="read"
                    title={
                        current.days
                            ? t('Lido em :duration', {
                                  duration: plural(current.days, 'dia', 'dias'),
                              })
                            : t('Lido')
                    }
                    reading={current}
                    onEditDates={() =>
                        openDialog({ kind: 'dates', reading: current })
                    }
                    extra={
                        current.rating === null && (
                            <span className="text-[13px] font-semibold text-warn">
                                {t('sem nota ainda: dê estrelas acima')}
                            </span>
                        )
                    }
                />
            )}

            {status === 'abandoned' && current && (
                <ClosedCard
                    tone="abandoned"
                    title={
                        book.pages
                            ? t('Abandonado na p. :page de :pages', {
                                  page: current.current_page,
                                  pages: book.pages,
                              })
                            : t('Abandonado na p. :page', {
                                  page: current.current_page,
                              })
                    }
                    reading={current}
                    onEditDates={() =>
                        openDialog({ kind: 'dates', reading: current })
                    }
                    extra={
                        <span className="text-[13px] font-semibold text-muted">
                            {t('motivo: :reason', {
                                reason:
                                    current.abandon_reason ??
                                    t('não informado'),
                            })}
                        </span>
                    }
                />
            )}

            <BookTabs
                book={book}
                current={current}
                sessions={sessions}
                notes={notes}
                noteKinds={note_kinds}
                tab={tab}
                onTabChange={setTab}
            />

            <ReadingsSection
                readings={readings}
                pages={book.pages}
                onEditDates={(reading) =>
                    openDialog({ kind: 'dates', reading })
                }
                onDelete={(reading) =>
                    openDialog({ kind: 'deleteReading', reading })
                }
            />

            <footer className="border-t border-border pt-4.5 font-mono text-[11px] text-faint">
                {t('dados: :source', { source: book.source_label })}
            </footer>

            <BookDialogs
                book={book}
                dialog={dialog}
                current={current}
                previous={previous}
                queuePosition={queue_position}
                removal={removal}
                onOpenDialog={openDialog}
                onClose={closeDialog}
            />

            {isEditing && (
                <BookEditor
                    book={book}
                    genres={genres}
                    lookup={lookup}
                    onClose={stopEditing}
                    onShowSessions={() => {
                        stopEditing();
                        setTab('sessions');
                    }}
                />
            )}
        </div>
    );
}
