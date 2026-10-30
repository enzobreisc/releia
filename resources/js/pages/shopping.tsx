import { Link } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { cardClass } from '@/components/card';
import { buttonClass } from '@/components/form';
import { StarIcon } from '@/components/icons';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { BoughtSection } from '@/components/shopping/bought-section';
import { SelectionBar } from '@/components/shopping/selection-bar';
import { ShoppingCard } from '@/components/shopping/shopping-card';
import { ShoppingForm } from '@/components/shopping/shopping-form';
import { ShoppingRow } from '@/components/shopping/shopping-row';
import { ShoppingSummary } from '@/components/shopping/shopping-summary';
import type { ShoppingTotals } from '@/components/shopping/shopping-summary';
import { ShoppingToolbar } from '@/components/shopping/shopping-toolbar';
import type {
    ShoppingFilters,
    ShoppingView,
} from '@/components/shopping/shopping-toolbar';
import { useSelection } from '@/hooks/use-selection';
import { useStored } from '@/hooks/use-stored';
import { useTranslation } from '@/hooks/use-translation';
import { sumPrices } from '@/lib/shopping';
import { index as queueIndex } from '@/routes/queue';
import type {
    ShoppingEntry,
    ShoppingMatches,
    StoreOption,
} from '@/types/queue';

type ShoppingProps = {
    shopping: ShoppingEntry[];
    stores: StoreOption[];
    filters: ShoppingFilters;
    totals: ShoppingTotals;
    queue_on_buy: boolean;
    queue_count: number;
    matches?: ShoppingMatches;
};

type Selection = ReturnType<typeof useSelection>;

export default function Shopping({
    shopping,
    stores,
    filters,
    totals,
    queue_on_buy,
    queue_count,
    matches,
}: ShoppingProps) {
    const { t, formatBRL } = useTranslation();
    // With a search in progress (?match=), the form comes back open.
    const [isAdding, setIsAdding] = useState(matches !== undefined);
    const [view, setView] = useStored<ShoppingView>('shopping.view', 'grid');
    const selection = useSelection();

    const pending = shopping.filter((item) => !item.bought);
    const buyNow = pending.filter((item) => item.is_priority);
    const wishlist = pending.filter((item) => !item.is_priority);
    const bought = shopping.filter((item) => item.bought);
    const selected = pending.filter((item) => selection.isSelected(item.id));
    const isFiltered = Boolean(filters.store || filters.q);

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title={t('Compras')}
                description={t('O que comprar e quanto vai custar')}
                actions={
                    <Link
                        href={queueIndex.url()}
                        className={buttonClass(
                            'ghost',
                            'h-10 gap-2 px-4 text-[13px]',
                        )}
                    >
                        {t('Fila de leitura')}
                        {queue_count > 0 && (
                            <span className="font-mono text-[11px] font-normal text-muted">
                                {t(':count na fila', { count: queue_count })}
                            </span>
                        )}
                    </Link>
                }
            />

            <ShoppingSummary
                totals={totals}
                queueOnBuy={queue_on_buy}
                isAdding={isAdding}
                onToggleAdding={() => setIsAdding(!isAdding)}
            />

            {isAdding && (
                <ShoppingForm
                    stores={stores}
                    storeFilter={filters.store}
                    matches={matches}
                    onClose={() => setIsAdding(false)}
                />
            )}

            <ShoppingToolbar
                stores={stores}
                filters={filters}
                view={view}
                onViewChange={setView}
            />

            {shopping.length === 0 && (
                <p className="text-[15px] font-semibold text-muted">
                    {isFiltered
                        ? t('Nenhum item com esses filtros.')
                        : t('Nenhum item nessa loja ainda.')}
                </p>
            )}

            {buyNow.length > 0 && (
                <ShoppingGroup
                    title={t('Para comprar agora')}
                    items={buyNow}
                    view={view}
                    selection={selection}
                    aside={
                        <>
                            <span className="font-mono text-[13px] text-secondary">
                                {formatBRL(sumPrices(buyNow))}
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    selection.select(
                                        buyNow.map((item) => item.id),
                                    )
                                }
                                className="text-[13px] font-bold text-link hover:underline"
                            >
                                {t('Selecionar todos')}
                            </button>
                        </>
                    }
                />
            )}

            {buyNow.length === 0 && pending.length > 0 && !isFiltered && (
                <p className="flex items-center gap-3 rounded-md border border-dashed border-strong px-5 py-4 text-sm font-semibold text-muted">
                    <StarIcon className="text-warn" />
                    {t(
                        'Marque com a estrela os livros que quer comprar agora: eles ficam aqui no topo.',
                    )}
                </p>
            )}

            {wishlist.length > 0 && (
                <ShoppingGroup
                    title={t('Lista de desejos')}
                    items={wishlist}
                    view={view}
                    selection={selection}
                />
            )}

            {bought.length > 0 && <BoughtSection items={bought} />}

            {selected.length > 0 && (
                <SelectionBar items={selected} onClear={selection.clear} />
            )}
        </div>
    );
}

function ShoppingGroup({
    title,
    items,
    view,
    selection,
    aside,
}: {
    title: string;
    items: ShoppingEntry[];
    view: ShoppingView;
    selection: Selection;
    aside?: ReactNode;
}) {
    const isGrid = view === 'grid';
    const Item = isGrid ? ShoppingCard : ShoppingRow;

    return (
        <section aria-label={title} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="flex items-center gap-2">
                    <SectionTitle>{title}</SectionTitle>
                    <span className="font-mono text-[11px] text-faint">
                        {items.length}
                    </span>
                </span>
                {aside && (
                    <span className="ml-auto flex items-center gap-4">
                        {aside}
                    </span>
                )}
            </div>
            <ul
                className={
                    isGrid
                        ? 'grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-5.5 gap-y-8'
                        : cardClass('flex flex-col')
                }
            >
                {items.map((item) => (
                    <Item
                        key={item.id}
                        item={item}
                        isSelected={selection.isSelected(item.id)}
                        onToggleSelect={() => selection.toggle(item.id)}
                    />
                ))}
            </ul>
        </section>
    );
}
