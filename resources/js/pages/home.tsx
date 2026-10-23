import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { BookCover } from '@/components/book-cover';
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
import {
    accept,
    dismiss,
    index as suggestionsIndex,
} from '@/routes/suggestions';
import type { BookCard, ReadingSummary, Suggestion, YearGoal } from '@/types';

type HomeProps = {
    reader_name: string | null;
    reading: ReadingSummary[];
    goal: YearGoal;
    recent: BookCard[];
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
    recent,
    suggestion,
}: HomeProps) {
    const { t } = useTranslation();
    const hello = t(greeting(new Date().getHours()));
    const [current, ...others] = reading;

    return (
        <div className="flex flex-col gap-10">
            <PageHeader
                title={reader_name ? `${hello}, ${reader_name}` : hello}
                headTitle={t('Início')}
                description={t('Um resumo rápido da sua leitura')}
            />

            {current ? (
                <ReadingHero item={current} />
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
                {others.length > 0 && <AlsoReading items={others} />}
                <GoalCard goal={goal} />
                {suggestion && <TodaySuggestion suggestion={suggestion} />}
            </div>

            <RecentlyFinished books={recent} />
        </div>
    );
}

function ReadingHero({ item }: { item: ReadingSummary }) {
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
                <Link
                    href={showBook(item.book_id).url}
                    className={buttonClass(
                        'primary',
                        'mt-1.5 h-12 self-start px-6.5 text-[15px]',
                    )}
                >
                    {t('Registrar leitura')}
                </Link>
            </div>
        </section>
    );
}

function AlsoReading({ items }: { items: ReadingSummary[] }) {
    const { t } = useTranslation();

    return (
        <section
            aria-label={t('Também lendo')}
            className={cardClass(
                'flex min-w-0 flex-[1_1_240px] flex-col gap-3 p-4.5',
            )}
        >
            <h2 className="text-xs font-bold text-muted">
                {t('Também lendo')}
            </h2>
            {items.map((item) => (
                <Link
                    key={item.reading_id}
                    href={showBook(item.book_id).url}
                    className="flex items-center gap-3.5"
                >
                    <BookCover
                        src={item.cover_url}
                        title={item.title}
                        className="w-11"
                    />
                    <span className="flex min-w-0 flex-col gap-1">
                        <span className="truncate text-[15px] font-bold">
                            {item.title}
                        </span>
                        <span className="font-mono text-xs text-muted">
                            {item.pages === null
                                ? t('pág. :page', { page: item.current_page })
                                : t('pág. :page de :pages', {
                                      page: item.current_page,
                                      pages: item.pages,
                                  })}
                            {item.percent !== null && ` · ${item.percent}%`}
                        </span>
                    </span>
                </Link>
            ))}
        </section>
    );
}

function GoalCard({ goal }: { goal: YearGoal }) {
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
            {editing && (
                <GoalForm
                    current={goal.goal}
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
    onSaved,
}: {
    current: number | null;
    onSaved: () => void;
}) {
    const { t } = useTranslation();
    const form = useForm({ yearly_goal: String(current ?? 12) });

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
                'flex min-w-0 flex-[1.4_1_340px] flex-wrap items-center gap-3.5 p-4.5',
            )}
        >
            <BookCover
                src={suggestion.cover_url}
                title={suggestion.title}
                className="w-11"
            />
            <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-1">
                <h2
                    id="suggestion-title"
                    className="text-xs font-bold text-muted"
                >
                    {t('Sugestão de hoje')}
                </h2>
                <p className="text-[15px] font-bold">
                    {suggestion.title}
                    {suggestion.authors && ` · ${suggestion.authors}`}
                </p>
                <p className="text-xs font-medium text-muted">
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
            <div className="flex flex-col gap-1.5">
                <Button
                    className="h-9 px-3.5 text-[13px]"
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
                    className="h-9 px-3.5 text-[13px]"
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

function RecentlyFinished({ books }: { books: BookCard[] }) {
    const { t } = useTranslation();

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
                <div className="grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-5">
                    {books.map((book) => (
                        <Link
                            key={book.id}
                            href={showBook(book.id).url}
                            className="flex min-w-0 flex-col gap-2.5"
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
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}
