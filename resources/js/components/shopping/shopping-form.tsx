import { router, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { cardClass } from '@/components/card';
import { Button, Field, IconButton, Input, Segmented } from '@/components/form';
import { SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { store as storeShopping } from '@/routes/shopping';
import type { Option } from '@/types';
import type { Candidate } from '@/types/library';
import type { ShoppingMatches } from '@/types/queue';

/**
 * New item. The search accepts an ISBN, title or Amazon link and shows the
 * matches; picking one fills the form with title, author, ISBN and cover.
 */
export function ShoppingForm({
    stores,
    storeFilter,
    matches,
    onClose,
}: {
    stores: Option[];
    storeFilter: string | null;
    matches?: ShoppingMatches;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const [search, setSearch] = useState(matches?.query ?? '');
    const [searching, setSearching] = useState(false);
    const [picked, setPicked] = useState<string | null>(null);
    const priceInput = useRef<HTMLInputElement>(null);
    const form = useForm({
        title: '',
        author: '',
        isbn: '',
        cover_url: '',
        url: '',
        store_type:
            storeFilter ??
            stores.find((s) => s.value === 'online')?.value ??
            stores[0]?.value ??
            '',
        estimated_price: '',
    });

    function lookUp(event: FormEvent) {
        event.preventDefault();

        if (search.trim() === '') {
            return;
        }

        // Pasted link: kept on the item, to open that listing instead of the search.
        if (/^https?:\/\//i.test(search.trim())) {
            form.setData('url', search.trim());
        }

        setPicked(null);
        router.reload({
            only: ['matches'],
            data: { match: search.trim(), store: storeFilter ?? undefined },
            onStart: () => setSearching(true),
            onFinish: () => setSearching(false),
        });
    }

    function pick(candidate: Candidate) {
        setPicked(candidate.isbn_13 ?? candidate.title);
        form.clearErrors();
        form.setData((data) => ({
            ...data,
            title: candidate.title,
            author: candidate.authors.join(', '),
            isbn: candidate.isbn_13 ?? '',
            cover_url: candidate.cover_url ?? '',
        }));
        // The price does not come from the metadata sources: it is the next thing to fill in.
        priceInput.current?.focus();
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(storeShopping.url(), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset(
                    'title',
                    'author',
                    'isbn',
                    'cover_url',
                    'url',
                    'estimated_price',
                );
                setSearch('');
                setPicked(null);
            },
        });
    }

    return (
        <section
            aria-label={t('Novo item')}
            className={cardClass(
                'flex flex-col gap-3.5 rounded-lg p-6 inset-ring-primary',
            )}
        >
            <div className="flex items-center justify-between">
                <SectionTitle>{t('Novo item')}</SectionTitle>
                <IconButton label={t('Fechar')} onClick={onClose}>
                    ×
                </IconButton>
            </div>

            <form onSubmit={lookUp} className="flex items-end gap-2">
                <Field
                    label={t('ISBN, título ou link da Amazon')}
                    className="flex-1"
                >
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t('Cole o link do anúncio ou digite')}
                        className="font-mono"
                    />
                </Field>
                <Button
                    type="submit"
                    variant="ghost"
                    disabled={searching || search.trim() === ''}
                >
                    {searching ? t('Buscando…') : t('Buscar')}
                </Button>
            </form>

            {matches && !searching && (
                <MatchList matches={matches} picked={picked} onPick={pick} />
            )}

            <form
                onSubmit={submit}
                className="grid gap-x-3 gap-y-3.5 sm:grid-cols-2"
            >
                <Field
                    label={t('Título')}
                    className="sm:col-span-2"
                    error={form.errors.title}
                >
                    <Input
                        value={form.data.title}
                        onChange={(event) =>
                            form.setData('title', event.target.value)
                        }
                        placeholder={t('Título do livro')}
                    />
                </Field>
                <Field label={t('Autor')} error={form.errors.author}>
                    <Input
                        value={form.data.author}
                        onChange={(event) =>
                            form.setData('author', event.target.value)
                        }
                    />
                </Field>
                <Field label={t('ISBN (opcional)')} error={form.errors.isbn}>
                    <Input
                        value={form.data.isbn}
                        onChange={(event) =>
                            form.setData('isbn', event.target.value)
                        }
                        inputMode="numeric"
                        className="font-mono"
                    />
                </Field>
                <Field
                    label={t('Link (opcional)')}
                    className="sm:col-span-2"
                    error={form.errors.url}
                >
                    <Input
                        value={form.data.url}
                        onChange={(event) =>
                            form.setData('url', event.target.value)
                        }
                        placeholder={t(
                            'Sem link, o app abre a busca na Amazon pelo ISBN',
                        )}
                        inputMode="url"
                    />
                </Field>
                <fieldset className="flex min-w-0 flex-col">
                    <legend className="pb-1.5 text-xs font-bold text-muted">
                        {t('Onde comprar')}
                    </legend>
                    <Segmented
                        options={stores}
                        value={form.data.store_type}
                        onChange={(value) => form.setData('store_type', value)}
                    />
                    {form.errors.store_type && (
                        <span className="text-xs font-semibold text-danger">
                            {form.errors.store_type}
                        </span>
                    )}
                </fieldset>
                <Field
                    label={t('Preço no anúncio (R$)')}
                    error={form.errors.estimated_price}
                >
                    <Input
                        ref={priceInput}
                        value={form.data.estimated_price}
                        onChange={(event) =>
                            form.setData('estimated_price', event.target.value)
                        }
                        placeholder={t('34,90')}
                        inputMode="decimal"
                        className="font-mono"
                    />
                </Field>
                <Button
                    type="submit"
                    disabled={form.processing || form.data.title.trim() === ''}
                    className="sm:col-span-2 sm:justify-self-start"
                >
                    {t('Adicionar à lista')}
                </Button>
            </form>
        </section>
    );
}

function MatchList({
    matches,
    picked,
    onPick,
}: {
    matches: ShoppingMatches;
    picked: string | null;
    onPick: (candidate: Candidate) => void;
}) {
    const { t } = useTranslation();

    if (matches.items.length === 0) {
        return (
            <p className="text-sm text-muted">
                {t(
                    'Nenhuma correspondência para “:query”. Preencha os dados à mão abaixo.',
                    { query: matches.query },
                )}
            </p>
        );
    }

    return (
        <ul className="flex flex-col gap-2" aria-label={t('Correspondências')}>
            {matches.items.map((candidate) => {
                const key = candidate.isbn_13 ?? candidate.title;

                return (
                    <li key={key}>
                        <button
                            type="button"
                            onClick={() => onPick(candidate)}
                            aria-pressed={picked === key}
                            className={cn(
                                'flex w-full items-center gap-3 rounded-sm bg-bg p-2 text-left inset-ring inset-ring-border hover:bg-active',
                                picked === key &&
                                    'bg-active inset-ring-primary',
                            )}
                        >
                            <BookCover
                                src={candidate.cover_url}
                                title={candidate.title}
                                className="w-9"
                            />
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="truncate text-sm font-semibold">
                                    {candidate.title}
                                </span>
                                <span className="truncate text-xs text-muted">
                                    {candidate.authors.join(', ') ||
                                        t('Autor não informado')}
                                    {candidate.publisher &&
                                        ` · ${candidate.publisher}`}
                                    {candidate.published_year &&
                                        ` · ${candidate.published_year}`}
                                    {candidate.isbn_13 &&
                                        ` · ISBN ${candidate.isbn_13}`}
                                </span>
                            </span>
                            {candidate.library_id !== null && (
                                <span className="font-mono text-[11px] text-muted">
                                    {t('já na biblioteca')}
                                </span>
                            )}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
