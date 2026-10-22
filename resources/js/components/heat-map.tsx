import { Fragment, useState } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { CalendarDay } from '@/types';

const LEVEL_HINTS: TranslationKey[] = [
    'sem leitura',
    '1–20 páginas',
    '21–40 páginas',
    '41–70 páginas',
    '71+ páginas',
];

const WEEKDAYS: TranslationKey[] = [
    'seg',
    'ter',
    'qua',
    'qui',
    'sex',
    'sáb',
    'dom',
];

// Classes written out in full: Tailwind only generates what appears like this in the code.
const HEAT_CLASSES = [
    'bg-heat-0',
    'bg-heat-1',
    'bg-heat-2',
    'bg-heat-3',
    'bg-heat-4',
];

/** Color class for a heat map level (0 = no reading, 4 = most). */
export function heatClass(level: number): string {
    return HEAT_CLASSES[level] ?? HEAT_CLASSES[0];
}

/**
 * Heat map of reading days.
 *
 * Default: GitHub style, one column per week and one row per weekday.
 * `compact`: a single row, no labels and no padding (e.g. 7 days in the sidebar).
 */
export function HeatMap({
    days,
    showLegend = false,
    compact = false,
    className,
}: {
    days: CalendarDay[];
    showLegend?: boolean;
    compact?: boolean;
    className?: string;
}) {
    const [selected, setSelected] = useState<string | null>(null);
    const { t, plural, languageTag } = useTranslation();

    function formatDate(date: string) {
        return new Date(`${date}T00:00:00`).toLocaleDateString(languageTag, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    }

    function dayTitle(day: CalendarDay) {
        return `${formatDate(day.date)} · ${plural(day.pages, 'página', 'páginas')}`;
    }

    if (compact) {
        return (
            <div
                role="img"
                aria-label={t('Mapa de calor de dias lidos')}
                className={cn('flex gap-[3px]', className)}
            >
                {days.map((day) => (
                    <span
                        key={day.date}
                        title={dayTitle(day)}
                        className={cn(
                            'size-3 rounded-[2px]',
                            heatClass(day.level),
                        )}
                    />
                ))}
            </div>
        );
    }

    // Pads the start of the first week with empty cells to align the days.
    const firstWeekday =
        days.length > 0
            ? (new Date(`${days[0].date}T00:00:00`).getDay() + 6) % 7
            : 0;
    const cells: (CalendarDay | null)[] = [
        ...Array.from({ length: firstWeekday }, () => null),
        ...days,
    ];

    // The columns share the available width: the map never scrolls sideways.
    const weeks = Math.ceil(cells.length / 7);

    // Month label on the first week it appears.
    const monthLabels = new Map<number, string>();
    let lastMonth = -1;
    for (let week = 0; week < weeks; week++) {
        const first = cells
            .slice(week * 7, week * 7 + 7)
            .find((cell) => cell !== null);
        if (!first) {
            continue;
        }
        const month = new Date(`${first.date}T00:00:00`).getMonth();
        if (month !== lastMonth) {
            monthLabels.set(
                week,
                new Date(`${first.date}T00:00:00`)
                    .toLocaleDateString(languageTag, { month: 'short' })
                    .replace('.', ''),
            );
            lastMonth = month;
        }
    }

    const today = new Date().toLocaleDateString('sv-SE');
    const active = days.find((day) => day.date === selected);

    return (
        <div className={cn('flex flex-col gap-3', className)}>
            <div
                role="img"
                aria-label={t('Mapa de calor de dias lidos')}
                className="grid gap-[3px]"
                style={{
                    gridTemplateColumns: `auto repeat(${weeks}, minmax(0, 1fr))`,
                    gridTemplateRows: 'auto repeat(7, auto)',
                    maxWidth: `${weeks * 24 + 36}px`,
                }}
            >
                <span />
                {Array.from({ length: weeks }, (_, week) => (
                    <span
                        key={`month-${week}`}
                        className="relative h-3 font-mono text-[10px] leading-none text-muted"
                    >
                        <span className="absolute left-0 whitespace-nowrap">
                            {monthLabels.get(week)}
                        </span>
                    </span>
                ))}
                {Array.from({ length: 7 }, (_, row) => (
                    <Fragment key={row}>
                        <span
                            className={cn(
                                'flex items-center pr-2 font-mono text-[11px] leading-none text-muted',
                            )}
                        >
                            {t(WEEKDAYS[row])}
                        </span>
                        {Array.from({ length: weeks }, (_, week) => {
                            const day = cells[week * 7 + row];
                            if (!day) {
                                return (
                                    <span
                                        key={`pad-${week}`}
                                        className="aspect-square"
                                    />
                                );
                            }
                            return (
                                <button
                                    key={day.date}
                                    type="button"
                                    title={dayTitle(day)}
                                    aria-label={dayTitle(day)}
                                    onMouseEnter={() => setSelected(day.date)}
                                    onFocus={() => setSelected(day.date)}
                                    onClick={() => setSelected(day.date)}
                                    onMouseLeave={() => setSelected(null)}
                                    onBlur={() => setSelected(null)}
                                    className={cn(
                                        'aspect-square rounded-[3px] transition-transform outline-none hover:scale-125 focus-visible:ring-2 focus-visible:ring-accent',
                                        heatClass(day.level),
                                        day.level === 0 &&
                                            'border border-border/60',
                                        day.date === today &&
                                            'ring-1 ring-text ring-offset-1 ring-offset-surface',
                                    )}
                                />
                            );
                        })}
                    </Fragment>
                ))}
            </div>
            <div className="flex min-h-5 flex-wrap items-center justify-between gap-x-4 gap-y-1.5 font-mono text-xs">
                <span className={active ? 'text-text' : 'text-faint'}>
                    {active
                        ? active.pages > 0
                            ? dayTitle(active)
                            : `${formatDate(active.date)} · ${t('sem leitura')}`
                        : t('passe o mouse sobre um dia')}
                </span>
                {showLegend && (
                    <span className="flex items-center gap-1.5 text-muted">
                        {t('menos')}
                        {[0, 1, 2, 3, 4].map((level) => (
                            <span
                                key={level}
                                title={t(LEVEL_HINTS[level])}
                                className={cn(
                                    'size-3 rounded-[3px]',
                                    heatClass(level),
                                    level === 0 && 'border border-border/60',
                                )}
                            />
                        ))}
                        {t('mais')}
                    </span>
                )}
            </div>
            {showLegend && (
                <p className="font-mono text-[11px] text-faint">
                    {t('1–20 · 21–40 · 41–70 · 71+ páginas por dia')}
                </p>
            )}
        </div>
    );
}
