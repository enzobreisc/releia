import { router } from '@inertiajs/react';
import { cardClass } from '@/components/card';
import { Button } from '@/components/form';
import { PlusIcon } from '@/components/icons';
import { SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { preference } from '@/routes/shopping';

export type ShoppingTotals = { pending_count: number; pending_cents: number };

/** Pending total, the "on buy" preference and the button that opens the form. */
export function ShoppingSummary({
    totals,
    queueOnBuy,
    isAdding,
    onToggleAdding,
}: {
    totals: ShoppingTotals;
    queueOnBuy: boolean;
    isAdding: boolean;
    onToggleAdding: () => void;
}) {
    const { t, plural, formatBRL } = useTranslation();

    return (
        <section
            aria-label={t('Resumo')}
            className={cardClass(
                'flex flex-wrap items-center gap-6 rounded-lg p-6',
            )}
        >
            <div className="flex flex-[1_1_260px] flex-col gap-1.5">
                <SectionTitle>{t('Lista de compras')}</SectionTitle>
                <span className="text-5xl leading-none font-extrabold tracking-tighter">
                    {formatBRL(totals.pending_cents)}
                </span>
                <span className="text-sm font-semibold text-muted">
                    {t(':items por comprar', {
                        items: plural(totals.pending_count, 'item', 'itens'),
                    })}
                </span>
            </div>
            {/* Saved preference: applies to every purchase until changed. */}
            <button
                type="button"
                onClick={() =>
                    router.put(
                        preference.url(),
                        { queue_on_buy: !queueOnBuy },
                        { preserveScroll: true },
                    )
                }
                title={t('Clique para alternar')}
                className="flex flex-col items-start gap-1 rounded-[16px] bg-bg px-4.5 py-3.5 text-left inset-ring inset-ring-strong hover:bg-surface"
            >
                <span className="text-xs font-bold text-muted">
                    {t('ao comprar:')}
                </span>
                <span className="text-[15px] font-extrabold">
                    {queueOnBuy ? t('quero ler + fila') : t('só quero ler')}
                </span>
            </button>
            <Button
                aria-expanded={isAdding}
                onClick={onToggleAdding}
                className="h-11 px-5.5"
            >
                <PlusIcon />
                {t('Adicionar item')}
            </Button>
        </section>
    );
}
