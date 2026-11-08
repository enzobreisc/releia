import { cardClass } from '@/components/card';
import { useTranslation } from '@/hooks/use-translation';
import { EMPTY_VALUE } from '@/lib/format';

export type BestMonth = { label: string; count: number };

export function BestMonthCard({ bestMonth }: { bestMonth: BestMonth | null }) {
    const { t, plural } = useTranslation();

    return (
        <div
            className={cardClass('flex flex-col justify-center gap-0.5 p-4.5')}
        >
            <span className="text-xs font-bold text-muted first-letter:uppercase">
                {t('melhor mês')}
            </span>
            <span className="text-[22px] font-extrabold">
                {bestMonth?.label ?? EMPTY_VALUE}
            </span>
            {bestMonth && (
                <span className="font-mono text-xs text-muted">
                    {plural(bestMonth.count, 'livro', 'livros')}
                </span>
            )}
        </div>
    );
}
