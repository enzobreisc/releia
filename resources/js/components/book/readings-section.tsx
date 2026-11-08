import { useState } from 'react';
import { ReadingRow } from '@/components/book/reading-row';
import { cardClass } from '@/components/card';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
import type { ReadingHistory } from '@/types';

export function ReadingsSection({
    readings,
    pages,
    onEditDates,
    onDelete,
}: {
    readings: ReadingHistory[];
    pages: number | null;
    onEditDates: (reading: ReadingHistory) => void;
    onDelete: (reading: ReadingHistory) => void;
}) {
    const { t, ordinal } = useTranslation();
    const [open, setOpen] = useState<number | null>(null);
    const finished = readings.filter((item) => item.status === 'read');
    const latest = readings.at(-1);

    return (
        <section aria-labelledby="readings" className="flex flex-col gap-3.5">
            <h2 id="readings" className="text-xl font-extrabold tracking-tight">
                {t('Leituras')}
            </h2>
            {finished.length >= 2 && <Comparison readings={finished} />}
            <div className={cardClass('overflow-hidden')}>
                {[...readings].reverse().map((item) => (
                    <ReadingRow
                        key={item.id}
                        reading={item}
                        pages={pages}
                        isCurrent={item.id === latest?.id}
                        expanded={open === item.id}
                        canDelete={readings.length > 1}
                        onToggle={() =>
                            setOpen(open === item.id ? null : item.id)
                        }
                        onEditDates={() => onEditDates(item)}
                        onDelete={() => onDelete(item)}
                    />
                ))}
            </div>
            {latest?.status === 'reading' && latest.number > 1 && (
                <p className="text-[13px] font-semibold text-muted">
                    {t(
                        'Quando a :ordinal leitura terminar, dias, ritmo e nota aparecem lado a lado.',
                        { ordinal: ordinal(latest.number, 'feminine') },
                    )}
                </p>
            )}
        </section>
    );
}

function Comparison({ readings }: { readings: ReadingHistory[] }) {
    const { t, plural, monthYear, ordinal } = useTranslation();
    const rows: {
        label: TranslationKey;
        value: (item: ReadingHistory) => string;
    }[] = [
        {
            label: 'duração',
            value: (item) =>
                item.days ? plural(item.days, 'dia', 'dias') : '—',
        },
        {
            label: 'ritmo',
            value: (item) =>
                item.pages_per_day
                    ? t(':pages págs/dia', {
                          pages: Math.round(item.pages_per_day),
                      })
                    : '—',
        },
        { label: 'sessões', value: (item) => String(item.sessions_count) },
        {
            label: 'Nota',
            value: (item) => (item.rating ? '★'.repeat(item.rating) : '—'),
        },
    ];

    return (
        <div
            className={cardClass(
                'grid gap-x-4 gap-y-2 px-5 py-4 font-mono text-xs',
            )}
            style={{
                gridTemplateColumns: `110px repeat(${readings.length}, minmax(0, 1fr))`,
            }}
        >
            <span />
            {readings.map((item) => (
                <span key={item.id} className="text-muted">
                    {ordinal(item.number, 'feminine')} ·{' '}
                    {item.finished_at ? monthYear(item.finished_at) : '—'}
                </span>
            ))}
            {rows.map((row) => (
                <ComparisonRow
                    key={row.label}
                    label={t(row.label).toLowerCase()}
                    values={readings.map(row.value)}
                />
            ))}
        </div>
    );
}

function ComparisonRow({ label, values }: { label: string; values: string[] }) {
    return (
        <>
            <span className="text-muted">{label}</span>
            {values.map((value, index) => (
                <span key={index}>{value}</span>
            ))}
        </>
    );
}
