import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Input } from '@/components/form';
import { ClockIcon } from '@/components/icons';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { update as updateShopping } from '@/routes/shopping';
import type { ShoppingEntry } from '@/types/queue';

/** Noted price, with the date it was checked. Clicking opens editing. */
export function PriceEditor({
    item,
    className,
}: {
    item: ShoppingEntry;
    className?: string;
}) {
    const { t, shortDate, formatBRL, locale } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const form = useForm({
        estimated_price:
            item.estimated_price_cents === null
                ? ''
                : (item.estimated_price_cents / 100)
                      .toFixed(2)
                      .replace('.', locale === 'en' ? '.' : ','),
    });

    function save(event: FormEvent) {
        event.preventDefault();
        form.patch(updateShopping.url(item.id), {
            preserveScroll: true,
            onSuccess: () => setIsEditing(false),
        });
    }

    if (isEditing) {
        return (
            <form onSubmit={save} className="flex flex-wrap items-center gap-2">
                <Input
                    aria-label={t('Preço de :title (R$)', {
                        title: item.title,
                    })}
                    value={form.data.estimated_price}
                    onChange={(event) =>
                        form.setData('estimated_price', event.target.value)
                    }
                    placeholder={t('34,90')}
                    inputMode="decimal"
                    autoFocus
                    className="h-10 w-24 font-mono"
                />
                <Button
                    type="submit"
                    variant="ghost"
                    disabled={form.processing}
                    className="h-10 px-4 text-[13px]"
                >
                    {t('Salvar')}
                </Button>
                {form.errors.estimated_price && (
                    <span className="text-xs font-semibold text-danger">
                        {form.errors.estimated_price}
                    </span>
                )}
            </form>
        );
    }

    return (
        <button
            type="button"
            disabled={item.bought}
            onClick={() => setIsEditing(true)}
            title={t('Atualizar preço')}
            className={cn(
                'flex shrink-0 flex-col items-end gap-0.5 rounded-sm px-2 py-1 hover:bg-active disabled:hover:bg-transparent',
                className,
            )}
        >
            <span className="text-lg font-extrabold">
                {item.estimated_price_cents === null
                    ? t('sem preço')
                    : formatBRL(item.estimated_price_cents)}
            </span>
            {item.price_checked_on && (
                <span
                    className={cn(
                        'flex items-center gap-1 font-mono text-[11px]',
                        item.price_stale ? 'text-warn' : 'text-muted',
                    )}
                >
                    {item.price_stale && <ClockIcon width={10} height={10} />}
                    {item.price_stale
                        ? `${shortDate(item.price_checked_on)} · ${t('conferir')}`
                        : t('em :date', {
                              date: shortDate(item.price_checked_on),
                          })}
                </span>
            )}
        </button>
    );
}
