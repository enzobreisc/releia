import { Link } from '@inertiajs/react';
import { useState } from 'react';
import { candidateKey } from '@/components/add-book/book-form';
import { EditionLabel } from '@/components/add-book/edition-label';
import { visibleEditions } from '@/lib/editions';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { show } from '@/routes/books';
import type { Candidate } from '@/types';

type EditionListProps = {
    editions: Candidate[] | null;
    publisher: string;
    selected: string | null;
    onSelect: (edition: Candidate) => void;
};

export function EditionList({
    editions,
    publisher,
    selected,
    onSelect,
}: EditionListProps) {
    const { t, plural } = useTranslation();
    const [showAll, setShowAll] = useState(false);
    const [expanded, setExpanded] = useState(false);

    if (editions === null) {
        return (
            <p className="px-4 pb-3 font-mono text-xs text-muted">
                {t('carregando edições…')}
            </p>
        );
    }

    if (editions.length === 0) {
        return (
            <p className="px-4 pb-3 text-sm text-muted">
                {publisher
                    ? t('Nenhuma edição com ISBN da editora ":publisher".', {
                          publisher,
                      })
                    : t('Nenhuma edição com ISBN.')}
            </p>
        );
    }

    const {
        items: visible,
        foreign,
        more,
    } = visibleEditions(editions, { showForeign: showAll, expanded });

    return (
        <ul
            aria-label={t('Edições')}
            className="mx-4 mb-3 flex max-h-96 flex-col overflow-y-auto"
        >
            {visible.map((edition) => (
                <EditionItem
                    key={candidateKey(edition)}
                    edition={edition}
                    selected={selected === candidateKey(edition)}
                    onSelect={() => onSelect(edition)}
                />
            ))}
            {foreign > 0 && (
                <li>
                    <button
                        type="button"
                        onClick={() => setShowAll(true)}
                        className="py-2.5 text-[13px] font-bold text-secondary hover:text-text"
                    >
                        {t('+ Mostrar :editions de outros países', {
                            editions: plural(foreign, 'edição', 'edições'),
                        })}
                    </button>
                </li>
            )}
            {more > 0 && (
                <li>
                    <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        className="py-2.5 text-[13px] font-bold text-secondary hover:text-text"
                    >
                        {t('+ Mostrar mais :count', { count: more })}
                    </button>
                </li>
            )}
        </ul>
    );
}

function EditionItem({
    edition,
    selected,
    onSelect,
}: {
    edition: Candidate;
    selected: boolean;
    onSelect: () => void;
}) {
    const { t } = useTranslation();
    const meta = [
        edition.published_year,
        edition.pages && t(':pages págs.', { pages: edition.pages }),
    ].filter(Boolean);

    return (
        <li>
            {edition.library_id ? (
                <Link
                    href={show.url(edition.library_id)}
                    className="flex items-center gap-3 border-t py-2.5 hover:bg-active"
                >
                    <EditionLabel edition={edition} meta={meta} />
                    <span className="font-mono text-[11px] text-link">
                        {t('na biblioteca')}
                    </span>
                </Link>
            ) : (
                <button
                    type="button"
                    onClick={onSelect}
                    aria-pressed={selected}
                    className={cn(
                        'flex w-full items-center gap-3 border-t py-2.5 text-left hover:bg-active',
                        selected && 'text-link',
                    )}
                >
                    <EditionLabel edition={edition} meta={meta} />
                </button>
            )}
        </li>
    );
}
