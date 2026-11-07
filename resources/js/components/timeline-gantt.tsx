import { Link } from '@inertiajs/react';
import { BookCover } from '@/components/book-cover';
import {
    barClass,
    DateRange,
    MONTH_GRID,
    RereadMark,
    ReadingTag,
    YearLabel,
} from '@/components/timeline-parts';
import { useTranslation } from '@/hooks/use-translation';
import { buildYearSegments, readingDays, yearFraction } from '@/lib/timeline';
import type { Segment } from '@/lib/timeline';
import { cn } from '@/lib/utils';
import { show } from '@/routes/books';
import type { TimelineYear } from '@/types';

const ROW_COLUMNS = 'grid-cols-[14rem_minmax(26rem,1fr)_12rem]';

function percent(fraction: number): string {
    return `${(fraction * 100).toFixed(2)}%`;
}

function GanttRow({
    segment,
    todayLeft,
    today,
}: {
    segment: Segment;
    todayLeft: number | null;
    today: string;
}) {
    const { plural } = useTranslation();
    const { reading, from, to } = segment;

    return (
        <Link
            href={show.url(reading.book_id)}
            className={cn(
                'grid h-14 items-center gap-5 rounded-xl px-1 hover:bg-surface',
                ROW_COLUMNS,
            )}
        >
            <span className="flex min-w-0 items-center gap-3">
                <BookCover
                    src={reading.cover_url}
                    title={reading.title}
                    className="w-7"
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-sm font-extrabold">
                        <span className="truncate">{reading.title}</span>
                        {reading.is_reread && (
                            <RereadMark className="text-link" />
                        )}
                    </span>
                    <span className="truncate text-xs font-semibold text-secondary">
                        {reading.authors}
                    </span>
                </span>
            </span>
            <span
                className="relative h-14 rounded-lg"
                style={{ background: MONTH_GRID }}
            >
                {todayLeft !== null && (
                    <span
                        aria-hidden="true"
                        className="absolute inset-y-0 w-0.5 rounded-full bg-accent"
                        style={{ left: percent(todayLeft) }}
                    />
                )}
                <span
                    className={cn(
                        'absolute top-5 h-4.5 rounded-md',
                        barClass(reading.status),
                    )}
                    style={{
                        left: percent(from),
                        width: `max(10px, ${percent(to - from)})`,
                    }}
                />
            </span>
            <span className="flex flex-col gap-0.5">
                <DateRange reading={reading} />
                <span className="flex items-center gap-2 font-mono text-xs text-muted">
                    {plural(readingDays(reading, today), 'dia', 'dias')}
                    <ReadingTag reading={reading} />
                </span>
            </span>
        </Link>
    );
}

/** The year's axis with one row per reading, its dates written beside the bar. */
export function TimelineGantt({
    years,
    today,
    monthNames,
}: {
    years: TimelineYear[];
    today: string;
    monthNames: string[];
}) {
    const currentYear = Number(today.slice(0, 4));

    return (
        <div className="flex flex-col gap-11 overflow-x-auto">
            {years.map(({ year, readings }, position) => (
                <section
                    key={year}
                    aria-label={String(year)}
                    className="flex min-w-[56rem] flex-col gap-1.5"
                >
                    <YearLabel year={year} position={position} />
                    <div
                        className={cn(
                            'mt-2 grid gap-5 px-1 font-mono text-[10px] text-faint',
                            ROW_COLUMNS,
                        )}
                    >
                        <span />
                        <span className="grid grid-cols-12">
                            {monthNames.map((name) => (
                                <span
                                    key={name}
                                    className="border-l border-border pl-1"
                                >
                                    {name}
                                </span>
                            ))}
                        </span>
                        <span />
                    </div>
                    {buildYearSegments(
                        [...readings].sort((a, b) =>
                            b.started_at.localeCompare(a.started_at),
                        ),
                        year,
                        today,
                    ).map((segment) => (
                        <GanttRow
                            key={segment.reading.id}
                            segment={segment}
                            today={today}
                            todayLeft={
                                year === currentYear
                                    ? yearFraction(today)
                                    : null
                            }
                        />
                    ))}
                </section>
            ))}
        </div>
    );
}
