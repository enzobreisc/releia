import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { cardClass } from '@/components/card';
import { Input, Segmented, Select } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { index } from '@/routes/shopping';
import type { StoreOption } from '@/types/queue';

export type ShoppingFilters = {
    store: string | null;
    q: string | null;
    sort: string | null;
};

export type ShoppingView = 'grid' | 'list';

const SORT_OPTIONS: { value: string; label: TranslationKey }[] = [
    { value: '', label: 'Ordem de adição' },
    { value: 'recent', label: 'Mais recentes' },
    { value: 'title', label: 'Título (A–Z)' },
    { value: 'price_asc', label: 'Menor preço' },
    { value: 'price_desc', label: 'Maior preço' },
];

const SEARCH_DELAY_MS = 300;

/** Store tabs, search, sort and the grid/list switch. */
export function ShoppingToolbar({
    stores,
    filters,
    view,
    onViewChange,
}: {
    stores: StoreOption[];
    filters: ShoppingFilters;
    view: ShoppingView;
    onViewChange: (view: ShoppingView) => void;
}) {
    const { t } = useTranslation();
    const [search, setSearch] = useState(filters.q ?? '');
    const allCount = stores.reduce((sum, store) => sum + store.count, 0);

    function filterBy(change: Partial<ShoppingFilters>) {
        const next = { ...filters, ...change };
        const query = Object.fromEntries(
            Object.entries(next).filter(([, value]) => value),
        );

        router.get(index.url(), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    // Search with a typing pause: it does not reload on every keystroke.
    useEffect(() => {
        if (search.trim() === (filters.q ?? '')) {
            return;
        }

        const timer = setTimeout(
            () => filterBy({ q: search.trim() || null }),
            SEARCH_DELAY_MS,
        );

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    return (
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div
                role="tablist"
                aria-label={t('Onde comprar')}
                className={cardClass('flex flex-wrap p-1')}
            >
                {[
                    { value: null, label: t('Todos'), count: allCount },
                    ...stores,
                ].map((store) => {
                    const isSelected = (filters.store ?? null) === store.value;

                    return (
                        <button
                            key={store.label}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            onClick={() => filterBy({ store: store.value })}
                            className={cn(
                                'h-9 rounded-full px-4 text-[13px] font-bold whitespace-nowrap',
                                isSelected
                                    ? 'bg-text text-bg'
                                    : 'text-secondary hover:bg-elevated hover:text-text',
                            )}
                        >
                            {store.label}{' '}
                            <span
                                className={cn(
                                    'font-mono text-[11px] font-normal',
                                    isSelected ? 'text-bg/70' : 'text-faint',
                                )}
                            >
                                {store.count}
                            </span>
                        </button>
                    );
                })}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
                <Input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t('Buscar por título ou autor')}
                    aria-label={t('Buscar na lista')}
                    className="w-60"
                />
                <Select
                    value={filters.sort ?? ''}
                    onChange={(event) =>
                        filterBy({ sort: event.target.value || null })
                    }
                    aria-label={t('Ordenar')}
                    className="w-auto"
                >
                    {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {t(option.label)}
                        </option>
                    ))}
                </Select>
                <Segmented
                    className="w-40"
                    value={view}
                    onChange={(next) => onViewChange(next as ShoppingView)}
                    options={[
                        { value: 'grid', label: t('Capas') },
                        { value: 'list', label: t('Lista') },
                    ]}
                />
            </div>
        </div>
    );
}
