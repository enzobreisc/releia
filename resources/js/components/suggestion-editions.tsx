import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { BookCover } from '@/components/book-cover';
import { Button } from '@/components/form';
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

/** Edições da obra: escolher uma cria exatamente essa edição na biblioteca. */
export type Choosing = 'want' | 'read';

/**
 * Edições da obra. Com `mode` (veio de "Quero ler" ou "Já li"), cada edição tem um só botão,
 * "Adicionar", que faz essa ação; sem `mode`, é só navegar e escolher uma das duas.
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
    const [items, setItems] = useState<Edition[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [expanded, setExpanded] = useState(false);

    // Sem lista para escolher, ainda dá para adicionar a edição que foi sugerida.
    const fallback = mode && (
        <Button
            variant="outline"
            className="h-9 px-3 text-xs"
            disabled={disabled}
            onClick={() =>
                router.visit(
                    mode === 'want' ? accept(id) : alreadyRead(id),
                    options,
                )
            }
        >
            Adicionar a edição sugerida
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
                Não foi possível carregar as edições.
                {fallback}
            </p>
        );
    }

    if (items === null) {
        return (
            <p className="basis-full font-mono text-xs text-muted">
                carregando edições…
            </p>
        );
    }

    // Brasileiras primeiro e sozinhas, sem repetidas; sem nenhuma brasileira, as demais.
    const {
        items: choosable,
        foreign,
        more,
    } = visibleEditions(items, { showForeign: showAll, expanded });

    if (choosable.length === 0) {
        return (
            <p className="flex basis-full flex-wrap items-center gap-3 text-sm text-muted">
                Nenhuma edição com ISBN.
                {fallback}
            </p>
        );
    }

    return (
        <ul
            aria-label="Edições"
            className="flex max-h-96 basis-full flex-col gap-1.5 overflow-y-auto border-t pt-4"
        >
            {mode && (
                <li className="flex items-center gap-3 pb-1 text-sm">
                    <span>
                        {mode === 'want'
                            ? 'Escolha a edição para adicionar a Quero ler'
                            : 'Escolha a edição que você leu'}
                    </span>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="text-xs text-muted hover:text-text"
                        >
                            cancelar
                        </button>
                    )}
                </li>
            )}
            {choosable.map((edition) => {
                const meta = [
                    edition.published_year,
                    edition.pages && `${edition.pages} págs.`,
                ].filter(Boolean);
                const data = { isbn_13: edition.isbn_13 };

                return (
                    <li
                        key={edition.isbn_13}
                        className="flex flex-wrap items-center gap-3 rounded-sm border bg-bg px-3 py-2"
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
                            <span className="font-mono text-[11px] text-accent">
                                na biblioteca
                            </span>
                        ) : mode ? (
                            <Button
                                variant="outline"
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
                                Adicionar
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    className="h-9 px-3 text-xs"
                                    disabled={disabled}
                                    onClick={() =>
                                        router.visit(accept(id), {
                                            ...options,
                                            data,
                                        })
                                    }
                                >
                                    Quero ler esta
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
                                    Já li esta
                                </Button>
                            </>
                        )}
                    </li>
                );
            })}
            {foreign > 0 && (
                <li>
                    <button
                        type="button"
                        onClick={() => setShowAll(true)}
                        className="text-xs text-accent hover:underline"
                    >
                        {`+ Mostrar ${foreign} ${foreign === 1 ? 'edição' : 'edições'} de outros países`}
                    </button>
                </li>
            )}
            {more > 0 && (
                <li>
                    <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        className="text-xs text-accent hover:underline"
                    >
                        {`+ Mostrar mais ${more}`}
                    </button>
                </li>
            )}
        </ul>
    );
}
