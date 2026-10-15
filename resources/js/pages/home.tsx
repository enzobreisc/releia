import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { Button, Field, Input } from '@/components/form';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { ProgressBar, progressText } from '@/components/reading-progress';
import { index as libraryIndex } from '@/routes/library';
import { update as updateGoal } from '@/routes/goal';
import { show as showBook } from '@/routes/books';
import type { BookCard, ReadingSummary, YearGoal } from '@/types';

type HomeProps = {
    reading: ReadingSummary[];
    goal: YearGoal;
    recent: BookCard[];
};

function greeting(hour: number): string {
    if (hour >= 5 && hour < 12) {
        return 'Bom dia';
    }

    return hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Home({ reading, goal, recent }: HomeProps) {
    return (
        <>
            <PageHeader
                title={greeting(new Date().getHours())}
                headTitle="Início"
                crumb="início"
                description="Um resumo rápido da sua leitura"
            />

            <div className="flex flex-wrap gap-6">
                <section className="flex min-w-0 flex-[2_1_360px] flex-col gap-4 rounded-md border bg-surface p-5">
                    <SectionTitle>lendo agora</SectionTitle>
                    {reading.length === 0 ? (
                        <p className="text-sm text-muted">
                            Nenhum livro em andamento.{' '}
                            <Link
                                href={libraryIndex.url()}
                                className="text-accent"
                            >
                                Abrir a biblioteca
                            </Link>
                        </p>
                    ) : (
                        reading.map((item) => (
                            <ReadingNow key={item.reading_id} item={item} />
                        ))
                    )}
                </section>

                <section className="flex min-w-0 flex-[1_1_240px] flex-col gap-3 rounded-md border bg-surface p-5">
                    <SectionTitle>{`meta de ${goal.year}`}</SectionTitle>
                    <p className="font-mono text-[40px] font-bold">
                        {goal.finished}
                        <span className="text-muted">
                            {' '}
                            / {goal.goal ?? '—'}
                        </span>
                    </p>
                    <p className="text-sm text-muted">livros lidos</p>
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
                        No ritmo atual: {goal.projected} livros até dezembro
                    </p>
                    <GoalForm current={goal.goal} />
                </section>
            </div>

            <section className="flex flex-col gap-3">
                <SectionTitle>últimos terminados</SectionTitle>
                {recent.length === 0 ? (
                    <p className="text-sm text-muted">
                        Os livros que você terminar aparecem aqui.
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
                <p className="text-[13px] text-muted">{progressText(item)}</p>
                <Link
                    href={showBook(item.book_id).url}
                    className="self-start rounded-sm bg-primary px-4 py-3 text-sm font-semibold text-white"
                >
                    Registrar leitura
                </Link>
            </div>
        </div>
    );
}

/** Meta de livros do ano, editável aqui mesmo. */
function GoalForm({ current }: { current: number | null }) {
    const form = useForm({ yearly_goal: String(current ?? 12) });

    function save(event: FormEvent) {
        event.preventDefault();
        form.submit(updateGoal(), { preserveScroll: true });
    }

    return (
        <form onSubmit={save} className="flex items-end gap-3">
            <Field label="Meta de livros" error={form.errors.yearly_goal}>
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
                Salvar meta
            </Button>
        </form>
    );
}
