import { Link } from '@inertiajs/react';
import { useState } from 'react';
import { barClass } from '@/components/timeline-parts';
import { useTranslation } from '@/hooks/use-translation';
import { dayOf, daysInMonth, readingsInMonth } from '@/lib/timeline';
import { cn } from '@/lib/utils';
import { show } from '@/routes/books';
import type { TimelineReading, TimelineYear } from '@/types';

const MONTH_COUNT = 12;

function MonthBlock({
    year,
    month,
    readings,
    today,
    monthName,
}: {
    year: number;
    month: number;
    readings: TimelineReading[];
    today: string;
    monthName: string;
}) {
    const { t, plural, shortDate } = useTranslation();
    const dayCount = daysInMonth(year, month);
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(dayCount).padStart(2, '0')}`;
    const isCurrentMonth = today.slice(0, 7) === firstDay.slice(0, 7);
    const columns = {
        gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))`,
    };

    function columnRange(reading: TimelineReading): string {
        const start =
            reading.started_at < firstDay ? 1 : dayOf(reading.started_at);
        const endDate = reading.finished_at ?? today;
        const end = endDate > lastDay ? dayCount : dayOf(endDate);

        return `${start} / ${end + 1}`;
    }

    return (
        <section
            aria-label={monthName}
            className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-4"
        >
            <div className="flex flex-col gap-0.5 pt-5.5">
                <h3 className="text-base font-extrabold">{monthName}</h3>
                <span className="font-mono text-[11px] text-faint">
                    {plural(readings.length, 'livro', 'livros')}
                </span>
            </div>
            <div className="flex flex-col gap-1">
                <div
                    className="grid font-mono text-[10px] text-faint"
                    style={columns}
                >
                    {Array.from({ length: dayCount }, (_, index) => (
                        <span key={index} className="text-center">
                            {index + 1}
                        </span>
                    ))}
                </div>
                <div className="relative overflow-hidden rounded-[10px] bg-surface">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 grid"
                        style={columns}
                    >
                        {Array.from({ length: dayCount }, (_, index) => (
                            <span
                                key={index}
                                className="border-l border-bg/60"
                            />
                        ))}
                    </div>
                    {isCurrentMonth && (
                        <span
                            aria-hidden="true"
                            className="absolute inset-y-0 w-0.5 bg-accent"
                            style={{
                                left: `${((dayOf(today) - 0.5) / dayCount) * 100}%`,
                            }}
                        />
                    )}
                    <div className="relative flex flex-col gap-1.5 p-2">
                        {readings.map((reading) => (
                            <div
                                key={reading.id}
                                className="grid"
                                style={columns}
                            >
                                <Link
                                    href={show.url(reading.book_id)}
                                    style={{ gridColumn: columnRange(reading) }}
                                    className={cn(
                                        'flex h-7 items-center overflow-hidden rounded-lg px-2.5 text-xs font-extrabold whitespace-nowrap',
                                        barClass(reading.status),
                                    )}
                                >
                                    <span className="truncate">
                                        {reading.title} ·{' '}
                                        {shortDate(reading.started_at)} →{' '}
                                        {reading.finished_at
                                            ? shortDate(reading.finished_at)
                                            : t('hoje')}
                                    </span>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

export function TimelineMonths({
    years,
    today,
    monthNames,
}: {
    years: TimelineYear[];
    today: string;
    monthNames: string[];
}) {
    const [selected, setSelected] = useState(years[0]?.year);
    const year = selected ?? Number(today.slice(0, 4));
    const months = Array.from({ length: MONTH_COUNT }, (_, index) => ({
        month: MONTH_COUNT - index,
        readings: readingsInMonth(years, year, MONTH_COUNT - index, today),
    })).filter(({ readings }) => readings.length > 0);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
                {years.map((group) => (
                    <button
                        key={group.year}
                        type="button"
                        aria-pressed={group.year === year}
                        onClick={() => setSelected(group.year)}
                        className={cn(
                            'h-8 rounded-full px-4 text-sm font-extrabold',
                            group.year === year
                                ? 'bg-text text-bg'
                                : 'bg-elevated text-secondary inset-ring inset-ring-strong hover:text-text',
                        )}
                    >
                        {group.year}
                    </button>
                ))}
            </div>
            {months.map(({ month, readings }) => (
                <MonthBlock
                    key={month}
                    year={year}
                    month={month}
                    readings={readings}
                    today={today}
                    monthName={monthNames[month - 1]}
                />
            ))}
        </div>
    );
}
