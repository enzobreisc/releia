import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { Button, Field, Input, buttonClass } from '@/components/form';
import { SuggestionEditions } from '@/components/suggestion-editions';
import type { Choosing } from '@/components/suggestion-editions';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { ProgressBar, progressText } from '@/components/reading-progress';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
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

    return (
        <>
            <PageHeader
                title={reader_name ? `${hello}, ${reader_name}` : hello}
                headTitle={t('Início')}
                description={t('Um resumo rápido da sua leitura')}
            />

            <div className="flex flex-wrap gap-6">
                <section className="flex min-w-0 flex-[2_1_360px] flex-col gap-4 rounded-md border bg-surface p-5">
                    <SectionTitle>{t('lendo agora')}</SectionTitle>
                    {reading.length === 0 ? (
                        <p className="text-sm text-muted">
                            {t('Nenhum livro em andamento.')}{' '}
                            <Link
                                href={libraryIndex.url()}
                                className="text-accent"
                            >
                                {t('Abrir a biblioteca')}
                            </Link>
                        </p>
                    ) : (
                        reading.map((item) => (
                            <ReadingNow key={item.reading_id} item={item} />
                        ))
                    )}
                </section>

                <section className="flex min-w-0 flex-[1_1_240px] flex-col gap-3 rounded-md border bg-surface p-5">
                    <SectionTitle>
                        {t('meta de :year', { year: goal.year })}
                    </SectionTitle>
                    <p className="font-mono text-[40px] font-bold">
                        {goal.finished}
                        <span className="text-muted">
                            {' '}
                            / {goal.goal ?? '—'}
                        </span>
                    </p>
                    <p className="text-sm text-muted">{t('livros lidos')}</p>
                    <ProgressBar
                        percent={
                            goal.goal
                                ? Math.min(
                                      100,
                                      Math.round(
                                          (goal.finished / goal.goal) * 100,
                                      ),
                                  )
                                : 0
                        }
                    />
                    <p className="text-sm text-muted">
                        {t('No ritmo atual: :count livros até dezembro', {
                            count: goal.projected,
                        })}
                    </p>
                    <GoalForm current={goal.goal} />
                </section>
            </div>

            {suggestion && <TodaySuggestion suggestion={suggestion} />}

            <section className="flex flex-col gap-3">
                <SectionTitle>{t('últimos terminados')}</SectionTitle>
                {recent.length === 0 ? (
                    <p className="text-sm text-muted">
                        {t('Os livros que você terminar aparecem aqui.')}
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-4">
                        {recent.map((book) => (
                            <Link
                                key={book.id}
                                href={showBook(book.id).url}
                                className="flex w-22 flex-col gap-1.5"
                            >
                                <BookCover
                                    src={book.cover_url}
                                    title={book.title}
                                    className="w-22"
                                />
                                <span className="truncate text-xs text-muted">
                                    {book.title}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </>
    );
}

function ReadingNow({ item }: { item: ReadingSummary }) {
    const translator = useTranslation();

    return (
        <div className="flex flex-wrap gap-5">
            <BookCover
                src={item.cover_url}
                title={item.title}
                className="w-24"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <p className="text-xl font-bold">{item.title}</p>
                <p className="text-sm text-muted">{item.authors}</p>
                <ProgressBar percent={item.percent} />
                <p className="text-[13px] text-muted">
                    {progressText(item, translator)}
                </p>
                <Link
                    href={showBook(item.book_id).url}
                    className="self-start rounded-sm bg-primary px-4 py-3 text-sm font-semibold text-white"
                >
                    {translator.t('Registrar leitura')}
                </Link>
            </div>
        </div>
    );
}

/** The year's book goal, editable right here. */
function GoalForm({ current }: { current: number | null }) {
    const { t } = useTranslation();
    const form = useForm({ yearly_goal: String(current ?? 12) });

    function save(event: FormEvent) {
        event.preventDefault();
        form.submit(updateGoal(), { preserveScroll: true });
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
        <section className="flex flex-wrap items-center gap-5 rounded-md border bg-surface p-5">
            <BookCover
                src={suggestion.cover_url}
                title={suggestion.title}
                className="w-18"
            />
            <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2">
                <SectionTitle>{t('sugestão de hoje')}</SectionTitle>
                <div className="text-lg font-bold">{suggestion.title}</div>
                {suggestion.authors && (
                    <div className="text-sm text-muted">
                        {suggestion.authors}
                    </div>
                )}
                <div className="text-sm text-muted">
                    {t('Por quê: :reason · parecido com :book', {
                        reason: suggestion.reason,
                        book: suggestion.based_on,
                    })}
                </div>
                <div className="flex flex-wrap gap-4">
                    <Link
                        href={suggestionsIndex.url()}
                        className="text-sm font-semibold text-accent hover:underline"
                    >
                        {t('Ver mais sugestões')}
                    </Link>
                    {suggestion.has_editions && (
                        <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setOpen(!open)}
                            className="text-sm text-accent hover:underline"
                        >
                            {open
                                ? t('− Esconder edições')
                                : t('+ Escolher edição')}
                        </button>
                    )}
                </div>
            </div>
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() =>
                        suggestion.has_editions
                            ? setChoosing('want')
                            : router.visit(accept(suggestion.id), options)
                    }
                    className={buttonClass('outline')}
                >
                    {t('Quero ler')}
                </button>
                <button
                    type="button"
                    onClick={() =>
                        router.visit(dismiss(suggestion.id), options)
                    }
                    className={buttonClass('ghost')}
                >
                    {t('Dispensar')}
                </button>
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
