import { BookNotes } from '@/components/book-notes';
import { FIRST_READING_NUMBER } from '@/components/book/constants';
import { PillGroup, PillOption } from '@/components/book/pill-group';
import { ReviewForm } from '@/components/book/review-form';
import { SessionLog } from '@/components/session-log';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
import type {
    BookDetail,
    Option,
    ReadingHistory,
    ReadingSession,
} from '@/types';
import type { NoteCard } from '@/types/notes';

export type BookTab = 'sessions' | 'notes' | 'review';

export function BookTabs({
    book,
    current,
    sessions,
    notes,
    noteKinds,
    tab,
    onTabChange,
}: {
    book: BookDetail;
    current: ReadingHistory | null;
    sessions: ReadingSession[];
    notes: NoteCard[];
    noteKinds: Option[];
    tab: BookTab;
    onTabChange: (tab: BookTab) => void;
}) {
    const { t, ordinal } = useTranslation();
    const number = current?.number ?? FIRST_READING_NUMBER;
    const tabs: { id: BookTab; label: TranslationKey; count?: number }[] = [
        { id: 'sessions', label: 'Sessões', count: sessions.length },
        { id: 'notes', label: 'Notas', count: notes.length },
        { id: 'review', label: 'Resenha' },
    ];

    return (
        <section
            aria-label={t('Sessões, notas e resenha')}
            className="flex flex-col gap-5"
        >
            <PillGroup role="tablist" label={t('Sessões, notas e resenha')}>
                {tabs.map((item) => (
                    <PillOption
                        key={item.id}
                        role="tab"
                        selected={tab === item.id}
                        onClick={() => onTabChange(item.id)}
                        className="px-4.5 text-sm"
                    >
                        {t(item.label)}
                        {item.count !== undefined && (
                            <span className="font-mono text-[11px] font-normal opacity-75">
                                {item.count}
                            </span>
                        )}
                    </PillOption>
                ))}
            </PillGroup>

            {tab === 'sessions' && (
                <SessionLog
                    sessions={sessions}
                    emptyText={
                        number > 1
                            ? t(
                                  'Nenhuma sessão nesta leitura. Registre a página em que você parou.',
                              )
                            : undefined
                    }
                />
            )}
            {tab === 'notes' && (
                <BookNotes bookId={book.id} notes={notes} kinds={noteKinds} />
            )}
            {/* The review stays mounted so the draft survives tab switches. */}
            <div hidden={tab !== 'review'}>
                <ReviewForm
                    key={current?.id ?? 'none'}
                    bookId={book.id}
                    review={book.reading?.review ?? ''}
                    label={ordinal(number, 'feminine')}
                    active={tab === 'review'}
                />
            </div>
        </section>
    );
}
