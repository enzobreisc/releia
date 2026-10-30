import { BookCover } from '@/components/book-cover';
import { BuyMenu } from '@/components/shopping/buy-menu';
import { ItemMenu } from '@/components/shopping/item-menu';
import { PriceEditor } from '@/components/shopping/price-editor';
import { PriorityButton } from '@/components/shopping/priority-button';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import type { ShoppingEntry } from '@/types/queue';

/** Item to buy in the cover grid. Clicking the cover selects it. */
export function ShoppingCard({
    item,
    isSelected,
    onToggleSelect,
}: {
    item: ShoppingEntry;
    isSelected: boolean;
    onToggleSelect: () => void;
}) {
    const { t } = useTranslation();

    return (
        <li className="relative flex min-w-0 flex-col gap-2.5">
            <div className="relative">
                <button
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-label={t('Selecionar :title', { title: item.title })}
                    onClick={onToggleSelect}
                    className={cn(
                        'group block w-full rounded-cover outline-offset-2',
                        isSelected && 'outline-2 outline-accent',
                    )}
                >
                    <BookCover
                        src={item.cover_url}
                        title={item.title}
                        className="w-full"
                    />
                    <span
                        aria-hidden="true"
                        className={cn(
                            'absolute bottom-2 left-2 flex size-6 items-center justify-center rounded-[7px] text-xs font-extrabold',
                            isSelected
                                ? 'bg-text text-bg'
                                : 'bg-bg/80 opacity-0 inset-ring-[1.5px] inset-ring-strong group-hover:opacity-100 group-focus-visible:opacity-100',
                        )}
                    >
                        {isSelected && '✓'}
                    </span>
                </button>
                <PriorityButton
                    item={item}
                    className="absolute right-1.5 bottom-1.5 bg-bg/80 hover:bg-bg"
                />
            </div>
            <div className="flex min-w-0 flex-col gap-0.75">
                <span className="line-clamp-2 text-sm leading-tight font-bold">
                    {item.title}
                </span>
                <span className="truncate text-[13px] font-medium text-muted">
                    {item.author || t('Autor não informado')} ·{' '}
                    {item.store_label}
                </span>
            </div>
            <PriceEditor item={item} className="-mx-2 items-start self-start" />
            <div className="flex items-center gap-1.5">
                <BuyMenu item={item} fitToParent className="flex-1" />
                <ItemMenu item={item} fitToParent />
            </div>
        </li>
    );
}
