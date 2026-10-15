import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { Button, Field, Select, Textarea } from '@/components/form';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { StarRating } from '@/components/star-rating';
import { biblioteca } from '@/routes';
import { destroy, leitura } from '@/routes/livros';
import type { BookDetail, Option } from '@/types';

type BookProps = {
    book: BookDetail;
    slug: string;
    statuses: Option[];
};

export default function Book({ book, slug, statuses }: BookProps) {
    const reading = book.reading;
    const [saving, setSaving] = useState(false);

    // Estante e nota salvam na hora; a resenha tem botão próprio.
    function update(data: { status?: string; rating?: number | null }) {
        router.visit(leitura(book.id), {
            data,
            preserveScroll: true,
            preserveState: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
        });
    }

    function remove() {
        if (
            confirm(
                `Remover "${book.title}" da biblioteca? Isso apaga também as leituras.`,
            )
        ) {
            router.visit(destroy(book.id));
        }
    }

    const meta = [
        book.pages && `${book.pages} páginas`,
        book.publisher,
        book.published_year,
        book.isbn_13 && `ISBN ${book.isbn_13}`,
        book.genre,
    ].filter(Boolean);

    return (
        <>
            <PageHeader title={book.title} crumb={['biblioteca', slug]} />
            <Link
                href={biblioteca.url()}
                className="-mt-4 self-start text-sm text-muted hover:text-text"
            >
                ← Voltar para a biblioteca
            </Link>

            <div className="flex flex-wrap items-start gap-8">
                <aside className="flex min-w-40 flex-[0_1_200px] flex-col gap-3.5">
                    <BookCover
                        src={book.cover_url}
                        title={book.title}
                        className="w-full max-w-50"
                    />
                    <Field label="Estante">
                        <Select
                            value={reading?.status ?? 'quero_ler'}
                            disabled={saving}
                            onChange={(event) =>
                                update({ status: event.target.value })
                            }
                        >
                            {statuses.map((status) => (
                                <option key={status.value} value={status.value}>
                                    {status.label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-muted">Sua nota</span>
                        <StarRating
                            value={reading?.rating ?? null}
                            disabled={saving}
                            onChange={(rating) => update({ rating })}
                        />
                    </div>
                    <ReadingDates reading={reading} />
                </aside>

                <section className="flex min-w-0 flex-[999_1_380px] flex-col gap-5.5">
                    <div>
                        {book.subtitle && (
                            <p className="text-[15px] text-muted">
                                {book.subtitle}
                            </p>
                        )}
                        <p className="mt-1.5 text-base text-muted">
                            {book.authors || 'Autor desconhecido'}
                        </p>
                        {meta.length > 0 && (
                            <p className="mt-2.5 font-mono text-xs text-muted">
                                {meta.join(' · ')}
                            </p>
                        )}
                    </div>

                    {book.description && (
                        <p className="max-w-prose text-sm leading-relaxed whitespace-pre-line text-muted">
                            {book.description}
                        </p>
                    )}

                    <section className="flex flex-col gap-3.5 rounded-md border bg-surface p-5">
                        <SectionTitle>progresso</SectionTitle>
                        <p className="text-sm text-muted">
                            Página atual e sessões de leitura entram na fase 2,
                            junto com o registro rápido pela barra de menu.
                        </p>
                    </section>

                    <ReviewForm
                        bookId={book.id}
                        review={reading?.review ?? ''}
                    />

                    <div className="flex items-center justify-between gap-4 border-t pt-5">
                        <span className="font-mono text-xs text-faint">
                            dados: {book.source_label}
                        </span>
                        <Button variant="danger" onClick={remove}>
                            Remover da biblioteca
                        </Button>
                    </div>
                </section>
            </div>
        </>
    );
}

function ReadingDates({ reading }: { reading: BookDetail['reading'] }) {
    if (!reading?.started_at) {
        return null;
    }

    const format = (date: string) =>
        new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });

    return (
        <dl className="flex flex-col gap-1 font-mono text-xs text-muted">
            <div>
                <dt className="inline">início </dt>
                <dd className="inline text-text">
                    {format(reading.started_at)}
                </dd>
            </div>
            {reading.finished_at && (
                <div>
                    <dt className="inline">fim </dt>
                    <dd className="inline text-text">
                        {format(reading.finished_at)}
                    </dd>
                </div>
            )}
        </dl>
    );
}

function ReviewForm({ bookId, review }: { bookId: number; review: string }) {
    const form = useForm({ review });

    function save(event: FormEvent) {
        event.preventDefault();
        form.submit(leitura(bookId), {
            preserveScroll: true,
            onSuccess: () => form.setDefaults(),
        });
    }

    return (
        <form onSubmit={save} className="flex flex-col gap-2">
            <label htmlFor="review" className="font-mono text-xs text-muted">
                ## resenha e anotações
            </label>
            <Textarea
                id="review"
                value={form.data.review}
                onChange={(event) => form.setData('review', event.target.value)}
                placeholder="O que você achou do livro? Ideias, trechos, impressões."
            />
            <div className="flex items-center gap-3">
                <Button
                    type="submit"
                    variant="ghost"
                    disabled={!form.isDirty || form.processing}
                >
                    {form.processing ? 'Salvando…' : 'Salvar resenha'}
                </Button>
                {form.recentlySuccessful && (
                    <span className="font-mono text-xs text-muted">salvo</span>
                )}
            </div>
        </form>
    );
}
