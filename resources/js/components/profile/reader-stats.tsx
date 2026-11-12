import { cardClass } from '@/components/card';
import { useTranslation } from '@/hooks/use-translation';
import type { ReaderTotals } from './types';

export function ReaderStats({ totals }: { totals: ReaderTotals }) {
    const { t, plural, languageTag } = useTranslation();

    const stats = [
        { label: t('livros lidos'), value: String(totals.books_read) },
        {
            label: t('páginas'),
            value: totals.pages_read.toLocaleString(languageTag),
        },
        {
            label: t('sequência'),
            value: plural(totals.streak, 'dia', 'dias'),
            title: t('Maior sequência: :days', {
                days: plural(totals.longest_streak, 'dia', 'dias'),
            }),
        },
        {
            label: t('págs/dia'),
            value:
                totals.pages_per_day === null
                    ? '—'
                    : String(Math.round(totals.pages_per_day * 10) / 10),
        },
    ];

    return (
        <dl className="grid grid-cols-2 gap-2.5">
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    title={stat.title}
                    className={cardClass('rounded-sm p-3.5')}
                >
                    <dt className="text-[11px] font-bold text-muted">
                        {stat.label}
                    </dt>
                    <dd className="mt-1 text-2xl font-extrabold">
                        {stat.value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
