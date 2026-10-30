import { BookCover } from '@/components/book-cover';
import { cardClass } from '@/components/card';
import { ItemMenu } from '@/components/shopping/item-menu';
import { useTranslation } from '@/hooks/use-translation';
import type { ShoppingEntry } from '@/types/queue';

/** Bought items, collapsed by default so the list shows only what is left to buy. */
export function BoughtSection({ items }: { items: ShoppingEntry[] }) {
    const { t } = useTranslation();

    return (
        <details className="group flex flex-col">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-secondary hover:text-text [&::-webkit-details-marker]:hidden">
                <span className="transition group-open:rotate-90">▸</span>
                {t('Comprados')}
                <span className="font-mono text-[11px] font-normal text-faint">
                    {items.length}
                </span>
            </summary>
            <ul className={cardClass('mt-3 flex flex-col')}>
                {items.map((item) => (
                    <BoughtRow key={item.id} item={item} />
                ))}
            </ul>
        </details>
    );
}

function BoughtRow({ item }: { item: ShoppingEntry }) {
    const { t, shortDate, formatBRL } = useTranslation();

    return (
        <li className="flex items-center gap-4 border-b px-4.5 py-3 last:border-b-0">
            <BookCover
                src={item.cover_url}
                title={item.title}
                className="w-8 opacity-70"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-bold text-secondary">
                        {item.title}
                    </span>
                    {item.queued && (
                        <span className="inline-flex h-5.5 items-center rounded-full bg-active px-2.5 text-[11px] font-bold text-link">
                            {t('na fila')}
                        </span>
                    )}
                </span>
                {item.bought_on && (
                    <span className="font-mono text-[11px] text-muted">
                        {t('comprado em :date', {
                            date: shortDate(item.bought_on),
                        })}
                    </span>
                )}
            </div>
            {item.estimated_price_cents !== null && (
                <span className="font-mono text-[13px] text-muted">
                    {formatBRL(item.estimated_price_cents)}
                </span>
            )}
            <ItemMenu item={item} />
        </li>
    );
}
