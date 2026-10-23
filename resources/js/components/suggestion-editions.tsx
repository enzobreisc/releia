import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { BookCover } from '@/components/book-cover';
import { Button } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { visibleEditions } from '@/lib/editions';
import {
    accept,
    alreadyRead,
    editions as editionsRoute,
} from '@/routes/suggestions';

type Edition = {
    isbn_13: string | null;
    title: string;
    publisher: string | null;
    published_year: number | null;
    pages: number | null;
    cover_url: string | null;
    library_id: number | null;
};

/** Editions of the work: picking one creates exactly that edition in the library. */
export type Choosing = 'want' | 'read';

/**
 * Editions of the work. With `mode` (came from "Want to read" or "Already read"), each edition has a single
 * "Add" button that does that action; without `mode`, you just browse and pick one of the two.
 */
export function SuggestionEditions({
    id,
    disabled,
    options,
    mode = null,
    onCancel,
}: {
    id: number;
    disabled: boolean;
    options: { preserveScroll: boolean };
    mode?: Choosing | null;
    onCancel?: () => void;
}) {
    const { t, plural } = useTranslation();
    const [items, setItems] = useState<Edition[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [expanded, setExpanded] = useState(false);

    // Without a list to choose from, the suggested edition can still be added.
    const fallback = mode && (
        <Button
            className="h-9 px-3 text-xs"
            disabled={disabled}
            onClick={() =>
                router.visit(
                    mode === 'want' ? accept(id) : alreadyRead(id),
                    options,
                )
            }
        >
            {t('Adicionar a edição sugerida')}
        </Button>
    );

    useEffect(() => {
        let active = true;

        fetch(editionsRoute.url(id), {
            headers: { Accept: 'application/json' },
        })
            .then((response) => response.json())
            .then(
                (data: { items: Edition[] }) => active && setItems(data.items),
            )
            .catch(() => active && setFailed(true));

        return () => {
            active = false;
        };
    }, [id]);

    if (failed) {
        return (
            <p className="flex basis-full flex-wrap items-center gap-3 text-sm text-muted">
                {t('Não foi possível carregar as edições.')}
                {fallback}
            </p>
        );
    }

    if (items === null) {
        return (
            <p className="basis-full font-mono text-xs text-muted">
                {t('carregando edições…')}
            </p>
        );
    }

    // Brazilian ones first and alone, without duplicates; with none, the others.
    const {
        items: choosable,
        foreign,
        more,
    } = visibleEditions(items, { showForeign: showAll, expanded });

    if (choosable.length === 0) {
        return (
            <p className="flex basis-full flex-wrap items-center gap-3 text-sm text-muted">
                {t('Nenhuma edição com ISBN.')}
                {fallback}
            </p>
        );
    }

    return (
        <ul
            aria-label={t('Edições')}
            className="flex max-h-96 basis-full flex-col overflow-y-auto border-t"
        >
            {mode && (
                <li className="flex items-center gap-3 py-2.5 text-sm font-semibold">
                    <span>
                        {mode === 'want'
                            ? t('Escolha a edição para adicionar a Quero ler')
                            : t('Escolha a edição que você leu')}
                    </span>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="text-xs font-bold text-link hover:underline"
                        >
                            {t('cancelar')}
                        </button>
                    )}
                </li>
            )}
            {choosable.map((edition) => {
                const meta = [
                    edition.published_year,
                    edition.pages &&
                        t(':pages págs.', { pages: edition.pages }),
                ].filter(Boolean);
                const data = { isbn_13: edition.isbn_13 };

                return (
                    <li
                        key={edition.isbn_13}
                        className="flex flex-wrap items-center gap-3 border-b py-2.5"
                    >
                        <BookCover
                            src={edition.cover_url}
                            title={edition.title}
                            className="w-9"
                        />
                        <span className="min-w-48 flex-1 text-[13px]">
                            {edition.publisher ?? edition.title}
                            {meta.length > 0 && (
                                <span className="text-muted">
                                    {' '}
                                    · {meta.join(' · ')}
                                </span>
                            )}
                            <span className="block font-mono text-[11px] text-faint">
                                {edition.isbn_13}
                                {edition.isbn_13?.match(/^978(85|65)/) &&
                                    ' · pt-BR'}
                            </span>
                        </span>
                        {edition.library_id ? (
                            <span className="font-mono text-[11px] text-link">
                                {t('na biblioteca')}
                            </span>
                        ) : mode ? (
                            <Button
                                className="h-9 px-3 text-xs"
                                disabled={disabled}
                                onClick={() =>
                                    router.visit(
                                        mode === 'want'
                                            ? accept(id)
                                            : alreadyRead(id),
                                        { ...options, data },
                                    )
                                }
                            >
                                {t('Adicionar')}
                            </Button>
                        ) : (
                            <>
                                <Button
                                    className="h-9 px-3 text-xs"
                                    disabled={disabled}
                                    onClick={() =>
                                        router.visit(accept(id), {
                                            ...options,
                                            data,
                                        })
                                    }
                                >
                                    {t('Quero ler esta')}
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="h-9 px-3 text-xs"
                                    disabled={disabled}
                                    onClick={() =>
                                        router.visit(alreadyRead(id), {
                                            ...options,
                                            data,
                                        })
                                    }
                                >
                                    {t('Já li esta')}
                                </Button>
                            </>
                        )}
                    </li>
                );
            })}
            {foreign > 0 && (
                <li className="py-2.5">
                    <button
                        type="button"
                        onClick={() => setShowAll(true)}
                        className="text-xs font-bold text-link hover:underline"
                    >
                        {t('+ Mostrar :editions de outros países', {
                            editions: plural(foreign, 'edição', 'edições'),
                        })}
                    </button>
                </li>
            )}
            {more > 0 && (
                <li className="py-2.5">
                    <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        className="text-xs font-bold text-link hover:underline"
                    >
                        {t('+ Mostrar mais :count', { count: more })}
                    </button>
                </li>
            )}
        </ul>
    );
}
