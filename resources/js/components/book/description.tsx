import { useState } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export function Description({ text }: { text: string }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    return (
        <section
            aria-label={t('Sinopse')}
            className="flex max-w-[72ch] flex-col items-start gap-2.5"
        >
            <p
                className={cn(
                    'text-[17px] leading-[1.65] font-medium whitespace-pre-line text-secondary',
                    !open && 'line-clamp-3',
                )}
            >
                {text}
            </p>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="h-8 text-sm font-bold text-link hover:underline"
            >
                {open ? t('− sinopse curta') : t('+ sinopse completa')}
            </button>
        </section>
    );
}
