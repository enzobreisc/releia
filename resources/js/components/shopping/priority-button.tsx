import { router } from '@inertiajs/react';
import { StarIcon } from '@/components/icons';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { priority } from '@/routes/shopping';
import type { ShoppingEntry } from '@/types/queue';

/** Star that moves the item between "buy now" and the wishlist. */
export function PriorityButton({
    item,
    className,
}: {
    item: ShoppingEntry;
    className?: string;
}) {
    const { t } = useTranslation();
    const label = item.is_priority
        ? t('Tirar de comprar agora')
        : t('Marcar para comprar agora');

    return (
        <button
            type="button"
            aria-pressed={item.is_priority}
            aria-label={label}
            title={label}
            onClick={() =>
                router.patch(
                    priority.url(item.id),
                    { is_priority: !item.is_priority },
                    { preserveScroll: true },
                )
            }
            className={cn(
                'inline-flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-active',
                item.is_priority ? 'text-warn' : 'text-muted hover:text-text',
                className,
            )}
        >
            <StarIcon
                fill={item.is_priority ? 'currentColor' : 'none'}
                width={18}
                height={18}
            />
        </button>
    );
}
