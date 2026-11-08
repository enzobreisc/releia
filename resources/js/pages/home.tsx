import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { LiveSessionPill } from '@/components/live-session-pill';
import { NextInQueueCard } from '@/components/next-in-queue-card';
import { TodayProgress } from '@/components/today-progress';
import { WeekSquares } from '@/components/week-squares';
import { cardClass } from '@/components/card';
import { Button, Field, Input, buttonClass } from '@/components/form';
import { SuggestionEditions } from '@/components/suggestion-editions';
import type { Choosing } from '@/components/suggestion-editions';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { ProgressBar } from '@/components/reading-progress';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { index as libraryIndex } from '@/routes/library';
import { update as updateGoal } from '@/routes/goal';
import { show as showBook } from '@/routes/books';
import { start as startLiveSession } from '@/routes/live-session';
import {
    accept,
    dismiss,
    index as suggestionsIndex,
} from '@/routes/suggestions';
import type {
    HomeLiveSession,
    HomeToday,
    NextInQueue,
    ReadingSummary,
    RecentBook,
    Suggestion,
    YearGoal,
} from '@/types';

type HomeProps = {
    reader_name: string | null;
    reading: ReadingSummary[];
    goal: YearGoal;
    today: HomeToday;
    live_session: HomeLiveSession | null;
    next_in_queue: NextInQueue | null;
    recent: RecentBook[];
    suggestion: Suggestion | null;
};

function greeting(hour: number): TranslationKey {
    if (hour >= 5 && hour < 12) {
        return 'Bom dia';
    }

    return hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Home({
    reader_name,
    reading,
    goal,
    today,
    live_session: liveSession,
    next_in_queue: nextInQueue,
    recent,
    suggestion,
}: HomeProps) {
    const { t } = useTranslation();
    const hello = t(greeting(new Date().getHours()));
    const [current] = reading;

    return (
        <div className="flex flex-col gap-10">
            <PageHeader
                title={reader_name ? `${hello}, ${reader_name}` : hello}
                headTitle={t('Início')}
                description={t('Um resumo rápido da sua leitura')}
                actions={
                    liveSession && <LiveSessionPill session={liveSession} />
                }
            />

            {current ? (
                <ReadingHero
                    item={current}
                    hasLiveSession={liveSession !== null}
                />
            ) : (
                <section className="flex flex-col gap-3">
                    <SectionTitle>{t('lendo agora')}</SectionTitle>
                    <p className="text-sm text-muted">
                        {t('Nenhum livro em andamento.')}{' '}
                        <Link
                            href={libraryIndex.url()}
                            className="text-link hover:underline"
                        >
                            {t('Abrir a biblioteca')}
                        </Link>
                    </p>
                </section>
            )}

            <div className="flex flex-wrap gap-4">
                <TodayCard today={today} />
                <NextInQueueCard
                    next={nextInQueue}
                    pagesPerDay={today.average}
                />
                <GoalCard goal={goal} dailyGoal={today.goal} />
            </div>

            {suggestion && <TodaySuggestion suggestion={suggestion} />}

            <RecentlyFinished books={recent} />
        </div>
    );
}

function ReadingHero({
    item,
    hasLiveSession,
}: {
    item: ReadingSummary;
    hasLiveSession: boolean;
}) {
    const { t } = useTranslation();

    return (
        <section className="flex flex-wrap items-end gap-11">
            <Link
                href={showBook(item.book_id).url}
                aria-label={t('Abrir :title', { title: item.title })}
            >
                <BookCover
                    src={item.cover_url}
                    title={item.title}
                    className="w-50 shadow-hero"
                />
            </Link>
            <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4 pb-1">
                <SectionTitle>{t('lendo agora')}</SectionTitle>
                <p className="text-[clamp(44px,5vw,68px)] leading-[0.95] font-extrabold tracking-[-0.04em]">
                    {item.title}
                </p>
                {item.authors && (
                    <p className="text-lg font-semibold text-secondary">
                        {item.authors}
                    </p>
                )}
                <div className="mt-2 flex max-w-130 flex-col gap-2">
                    <ProgressBar percent={item.percent} />
                    <div className="flex justify-between font-mono text-[13px] text-muted">
                        <span>
                            {item.pages === null
                                ? t('pág. :page', { page: item.current_page })
                                : t('pág. :page de :pages', {
                                      page: item.current_page,
                                      pages: item.pages,
                                  })}
                        </span>
                        {item.percent !== null && <span>{item.percent}%</span>}
                    </div>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-3">
                    <Link
                        href={showBook(item.book_id).url}
                        className={buttonClass(
                            'primary',
                            'h-12 px-6.5 text-[15px]',
                        )}
                    >
                        {t('Registrar leitura')}
                    </Link>
                    {!item.finish_suggested && !hasLiveSession && (
                        <Button
                            variant="ghost"
                            onClick={() =>
                                router.post(startLiveSession.url(item.book_id))
                            }
                            className="h-12 px-6.5 text-[15px]"
                        >
                            {t('Iniciar sessão')}
                        </Button>
                    )}
                </div>
            </div>
        </section>
    );
}

function TodayCard({ today }: { today: HomeToday }) {
    const { t, plural } = useTranslation();

    return (
        <section
            aria-labelledby="today-title"
            className={cardClass(
                'flex min-w-0 flex-[1_1_260px] flex-col gap-3 p-4.5',
            )}
        >
            <div className="flex items-baseline justify-between gap-3">
                <h2 id="today-title" className="text-xs font-bold text-muted">
                    {t('Hoje')}
                </h2>
                <span className="font-mono text-xs text-muted">
                    {t('sequência')} {plural(today.streak, 'dia', 'dias')}
                </span>
            </div>
            <p className="flex items-baseline gap-1.5">
                <span className="text-4xl leading-none font-extrabold tracking-tight">
                    {today.pages}
                </span>
                <span className="text-[15px] font-semibold text-muted">
                    {t('págs')}
                </span>
            </p>
            <TodayProgress
                pagesToday={today.pages}
                averagePages={today.average}
                dailyGoal={today.goal}
            />
            <WeekSquares week={today.week} />
        </section>
    );
}

function GoalCard({
    goal,
    dailyGoal,
}: {
    goal: YearGoal;
    dailyGoal: number | null;
}) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);
    const percent = goal.goal
        ? Math.min(100, Math.round((goal.finished / goal.goal) * 100))
        : null;

    return (
        <section
            aria-labelledby="goal-title"
            className={cardClass(
                'flex min-w-0 flex-[1_1_260px] flex-col gap-3 p-4.5',
            )}
        >
            <div className="flex items-baseline justify-between gap-3">
                <h2 id="goal-title" className="text-xs font-bold text-muted">
                    {t('Meta de :year', { year: goal.year })}
                </h2>
                <div className="flex items-baseline gap-3">
                    {percent !== null && (
                        <span className="font-mono text-xs text-muted">
                            {percent}%
                        </span>
                    )}
                    <button
                        type="button"
                        aria-expanded={editing}
                        onClick={() => setEditing(!editing)}
                        className="text-xs font-bold text-link hover:underline"
                    >
                        {editing ? t('fechar') : t('editar')}
                    </button>
                </div>
            </div>
            <p className="flex items-baseline gap-1.5">
                <span className="text-4xl leading-none font-extrabold tracking-tight">
                    {goal.finished}
                </span>
                {goal.goal !== null && (
                    <span className="text-[15px] font-semibold text-muted">
                        {t('de :count livros', { count: goal.goal })}
                    </span>
                )}
            </p>
            {goal.goal !== null && (
                <GoalTallies goal={goal.goal} finished={goal.finished} />
            )}
            <p className="text-xs font-medium text-muted">
                {t('No ritmo atual: :count livros até dezembro', {
                    count: goal.projected,
                })}
            </p>
            {dailyGoal !== null && (
                <p className="flex items-baseline justify-between gap-3 border-t border-border pt-3 text-[13px] font-semibold text-secondary">
                    <span>{t('Meta diária')}</span>
                    <span>
                        <strong className="font-extrabold text-text">
                            {t(':pages págs', { pages: dailyGoal })}
                        </strong>{' '}
                        {t('por dia')}
                    </span>
                </p>
            )}
            {editing && (
                <GoalForm
                    current={goal.goal}
                    currentDaily={dailyGoal}
                    onSaved={() => setEditing(false)}
                />
            )}
        </section>
    );
}

function GoalTallies({ goal, finished }: { goal: number; finished: number }) {
    const { t } = useTranslation();

    return (
        <div
            role="img"
            aria-label={t(':finished de :goal livros lidos', {
                finished,
                goal,
            })}
            className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-[3px]"
        >
            {Array.from({ length: goal }, (_, index) => (
                <span
                    key={index}
                    className={cn(
                        'aspect-square rounded-[2px]',
                        index < finished ? 'bg-heat-3' : 'bg-heat-0',
                    )}
                />
            ))}
        </div>
    );
}

function GoalForm({
    current,
    currentDaily,
    onSaved,
}: {
    current: number | null;
    currentDaily: number | null;
    onSaved: () => void;
}) {
    const { t } = useTranslation();
    const form = useForm({
        yearly_goal: String(current ?? 12),
        daily_goal: currentDaily === null ? '' : String(currentDaily),
    });

    function save(event: FormEvent) {
        event.preventDefault();
        form.submit(updateGoal(), {
            preserveScroll: true,
            onSuccess: onSaved,
        });
    }

    return (
        <form onSubmit={save} className="flex items-end gap-3">
            <Field label={t('Meta de livros')} error={form.errors.yearly_goal}>
                <Input
                    type="number"
                    min={1}
                    max={999}
                    value={form.data.yearly_goal}
                    onChange={(event) =>
                        form.setData('yearly_goal', event.target.value)
                    }
                />
            </Field>
            <Field
                label={t('Meta diária (páginas)')}
                error={form.errors.daily_goal}
            >
                <Input
                    type="number"
                    min={1}
                    max={2000}
                    value={form.data.daily_goal}
                    onChange={(event) =>
                        form.setData('daily_goal', event.target.value)
                    }
                />
            </Field>
            <Button
                type="submit"
                variant="ghost"
                disabled={form.processing || !form.isDirty}
            >
                {t('Salvar meta')}
            </Button>
        </form>
    );
}

/** Today's suggestion: always with the reason, tied to a book already read. */
function TodaySuggestion({ suggestion }: { suggestion: Suggestion }) {
    const { t } = useTranslation();
    const options = { preserveScroll: true };
    const [open, setOpen] = useState(false);
    const [choosing, setChoosing] = useState<Choosing | null>(null);

    return (
        <section
            aria-labelledby="suggestion-title"
            className={cardClass(
                'flex min-w-0 flex-wrap items-center gap-5 px-5.5 py-5',
            )}
        >
            <BookCover
                src={suggestion.cover_url}
                title={suggestion.title}
                className="w-16.5"
            />
            <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-1.5">
                <h2
                    id="suggestion-title"
                    className="text-xs font-bold text-muted"
                >
                    {t('Sugestão de hoje')}
                </h2>
                <p className="text-xl font-extrabold tracking-tight">
                    {suggestion.title}
                    {suggestion.authors && (
                        <span className="font-semibold text-secondary">
                            {' '}
                            · {suggestion.authors}
                        </span>
                    )}
                </p>
                <p className="text-[13px] font-medium text-muted">
                    {t('Por quê: :reason · parecido com :book', {
                        reason: suggestion.reason,
                        book: suggestion.based_on,
                    })}
                </p>
                <div className="flex flex-wrap gap-4">
                    <Link
                        href={suggestionsIndex.url()}
                        className="text-xs font-bold text-link hover:underline"
                    >
                        {t('Ver mais sugestões')}
                    </Link>
                    {suggestion.has_editions && (
                        <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setOpen(!open)}
                            className="text-xs font-bold text-link hover:underline"
                        >
                            {open
                                ? t('− Esconder edições')
                                : t('+ Escolher edição')}
                        </button>
                    )}
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <Button
                    className="h-10 px-4 text-[13px]"
                    onClick={() =>
                        suggestion.has_editions
                            ? setChoosing('want')
                            : router.visit(accept(suggestion.id), options)
                    }
                >
                    {t('Quero ler')}
                </Button>
                <Button
                    variant="ghost"
                    className="h-10 px-4 text-[13px]"
                    onClick={() =>
                        router.visit(dismiss(suggestion.id), options)
                    }
                >
                    {t('Dispensar')}
                </Button>
            </div>
            {(open || choosing) && (
                <SuggestionEditions
                    key={choosing ?? 'browse'}
                    id={suggestion.id}
                    disabled={false}
                    options={options}
                    mode={choosing}
                    onCancel={() => {
                        setChoosing(null);
                        setOpen(false);
                    }}
                />
            )}
        </section>
    );
}

function RecentlyFinished({ books }: { books: RecentBook[] }) {
    const { t, plural, shortDate } = useTranslation();

    return (
        <section
            aria-labelledby="finished-title"
            className="flex flex-col gap-4"
        >
            <div className="flex items-baseline justify-between gap-3">
                <h2
                    id="finished-title"
                    className="text-xl font-extrabold tracking-tight"
                >
                    {t('Últimos terminados')}
                </h2>
                <Link
                    href={libraryIndex.url()}
                    className="text-[13px] font-bold text-link hover:underline"
                >
                    {t('Ver biblioteca')}
                </Link>
            </div>
            {books.length === 0 ? (
                <p className="text-sm text-muted">
                    {t('Os livros que você terminar aparecem aqui.')}
                </p>
            ) : (
                <div className="flex gap-4 overflow-x-auto pb-2">
                    {books.map((book) => (
                        <Link
                            key={book.id}
                            href={showBook(book.id).url}
                            className="flex max-w-32 min-w-24 flex-1 basis-24 flex-col gap-2.5"
                        >
                            <BookCover
                                src={book.cover_url}
                                title={book.title}
                                className="w-full"
                            />
                            <span className="flex min-w-0 flex-col gap-0.5">
                                <span className="truncate text-[13px] font-bold">
                                    {book.title}
                                </span>
                                <span className="truncate text-xs font-medium text-muted">
                                    {book.authors}
                                </span>
                                {book.finished_at && (
                                    <span className="mt-0.5 font-mono text-[11px] text-secondary">
                                        {shortDate(book.finished_at)}
                                        {book.days !== null &&
                                            ` · ${plural(book.days, 'dia', 'dias')}`}
                                    </span>
                                )}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}
