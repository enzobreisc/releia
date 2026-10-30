import { router } from '@inertiajs/react';
import { useState } from 'react';
import { cardClass } from '@/components/card';
import { Button } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { sumPrices } from '@/lib/shopping';
import { buyMany, destroyMany } from '@/routes/shopping';
import type { ShoppingEntry } from '@/types/queue';

/** Floating bar with the selection's total and the actions applied to all of it at once. */
export function SelectionBar({
    items,
    onClear,
}: {
    items: ShoppingEntry[];
    onClear: () => void;
}) {
    const { t, plural, formatBRL } = useTranslation();
    const [isProcessing, setIsProcessing] = useState(false);
    const ids = items.map((item) => item.id);
    const totalCents = sumPrices(items);
    const withoutPrice = items.filter(
        (item) => item.estimated_price_cents === null,
    ).length;

    const requestOptions = {
        preserveScroll: true,
        onStart: () => setIsProcessing(true),
        onFinish: () => setIsProcessing(false),
        onSuccess: onClear,
    };

    return (
        <div
            role="region"
            aria-label={t('Seleção')}
            className={cardClass(
                'sticky bottom-4 z-20 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg px-5 py-3.5 shadow-float inset-ring-strong',
            )}
        >
            <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-bold text-secondary">
                    {plural(items.length, 'selecionado', 'selecionados')}
                </span>
                <span className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold tracking-tight">
                        {formatBRL(totalCents)}
                    </span>
                    {withoutPrice > 0 && (
                        <span className="text-xs font-semibold text-warn">
                            {t('+ :count sem preço', { count: withoutPrice })}
                        </span>
                    )}
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    variant="ghost"
                    onClick={onClear}
                    className="h-10 bg-transparent px-4 text-[13px]"
                >
                    {t('Limpar')}
                </Button>
                <Button
                    variant="danger"
                    disabled={isProcessing}
                    onClick={() =>
                        router.delete(destroyMany.url(), {
                            data: { ids },
                            ...requestOptions,
                        })
                    }
                    className="h-10 px-4 text-[13px]"
                >
                    {t('Excluir')}
                </Button>
                <Button
                    disabled={isProcessing}
                    onClick={() =>
                        router.post(buyMany.url(), { ids }, requestOptions)
                    }
                    className="h-10 px-4.5 text-[13px]"
                >
                    {t('Marcar como comprados')}
                </Button>
            </div>
        </div>
    );
}
