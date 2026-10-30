import { BookCover } from '@/components/book-cover';
import { BuyMenu } from '@/components/shopping/buy-menu';
import { ItemMenu } from '@/components/shopping/item-menu';
import { PriceEditor } from '@/components/shopping/price-editor';
import { PriorityButton } from '@/components/shopping/priority-button';
import { SelectCheckbox } from '@/components/shopping/select-checkbox';
import { useTranslation } from '@/hooks/use-translation';
import type { ShoppingEntry } from '@/types/queue';

/** Item to buy in the list view. */
export function ShoppingRow({
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
        <li className="flex flex-wrap items-center gap-4 border-b px-4.5 py-3.5 last:border-b-0">
            <SelectCheckbox
                title={item.title}
                isSelected={isSelected}
                onToggle={onToggleSelect}
            />
            <PriorityButton item={item} className="-mx-2" />
            <BookCover
                src={item.cover_url}
                title={item.title}
                className="w-10"
            />
            <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
                <span className="text-[15px] font-extrabold">{item.title}</span>
                <span className="text-[13px] font-medium text-muted">
                    {item.author || t('Autor não informado')} ·{' '}
                    {item.store_label}
                </span>
            </div>
            <PriceEditor item={item} className="min-w-27.5" />
            <div className="flex items-center gap-1.5">
                <BuyMenu item={item} />
                <ItemMenu item={item} />
            </div>
        </li>
    );
}
