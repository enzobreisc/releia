import { Link } from '@inertiajs/react';
import { BookCover } from '@/components/book-cover';
import { cardClass } from '@/components/card';
import { DateRange, ReadingTag, YearLabel } from '@/components/timeline-parts';
import { useTranslation } from '@/hooks/use-translation';
import { isOngoing, monthOf, readingDays, toSegment } from '@/lib/timeline';
import { cn } from '@/lib/utils';
import { show } from '@/routes/books';
import type { TimelineReading } from '@/types';

type YearReadings = { year: number; readings: TimelineReading[] };

function endOf(reading: TimelineReading, today: string): string {
    return reading.finished_at ?? today;
}

/** Newest month first; inside a month, the latest ending first. */
function groupByEndMonth(readings: TimelineReading[], today: string) {
    const months = new Map<number, TimelineReading[]>();

    [...readings]
        .sort((a, b) => endOf(b, today).localeCompare(endOf(a, today)))
        .forEach((reading) => {
            const month = monthOf(endOf(reading, today));
            months.set(month, [...(months.get(month) ?? []), reading]);
        });

    return [...months.entries()];
}

function YearPosition({
    reading,
    year,
    today,
}: {
    reading: TimelineReading;
    year: number;
    today: string;
}) {
    const { from, to } = toSegment(reading, year, today);

    return (
        <span
            aria-hidden="true"
            className="relative h-1.5 w-36 rounded-full bg-heat-0"
        >
            <span
                className={cn(
                    'absolute inset-y-0 min-w-1 rounded-full',
                    reading.status === 'abandoned'
                        ? 'bg-linear-to-r from-warn-line to-transparent'
                        : isOngoing(reading)
                          ? 'bg-heat-2 ring-[1.5px] ring-text'
                          : 'bg-heat-1',
                )}
                style={{
                    left: `${from * 100}%`,
                    width: `${(to - from) * 100}%`,
                }}
            />
        </span>
    );
}

function AgendaRow({
    reading,
    year,
    today,
}: {
    reading: TimelineReading;
    year: number;
    today: string;
}) {
    const { plural } = useTranslation();

    return (
        <Link
            href={show.url(reading.book_id)}
            className={cardClass(
                'grid grid-cols-[9.5rem_2.25rem_minmax(0,1fr)_auto_auto] items-center gap-4.5 px-3.5 py-2.5 hover:bg-elevated',
            )}
        >
            <DateRange reading={reading} />
            <BookCover
                src={reading.cover_url}
                title={reading.title}
                className="w-9"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[15px] font-extrabold">
                    {reading.title}
                </span>
                <span className="truncate text-xs font-semibold text-secondary">
                    {reading.authors}
                </span>
            </span>
            <ReadingTag reading={reading} />
            <span className="flex items-center justify-end gap-3.5">
                <span className="font-mono text-xs text-muted">
                    {plural(readingDays(reading, today), 'dia', 'dias')}
                </span>
                <YearPosition reading={reading} year={year} today={today} />
            </span>
        </Link>
    );
}

/** Every reading with the day it started and ended, grouped by the month it ended. */
export function TimelineAgenda({
    groups,
    today,
    monthNames,
}: {
    groups: YearReadings[];
    today: string;
    monthNames: string[];
}) {
    return (
        <div className="flex flex-col gap-11">
            {groups.map(({ year, readings }, position) => (
                <section
                    key={year}
                    aria-label={String(year)}
                    className="flex flex-col gap-3.5"
                >
                    <YearLabel year={year} position={position} />
                    {groupByEndMonth(readings, today).map(
                        ([month, monthReadings]) => (
                            <div key={month} className="flex flex-col gap-2">
                                <h3 className="text-xs font-bold text-muted">
                                    {monthNames[month - 1]}
                                </h3>
                                {monthReadings.map((reading) => (
                                    <AgendaRow
                                        key={reading.id}
                                        reading={reading}
                                        year={year}
                                        today={today}
                                    />
                                ))}
                            </div>
                        ),
                    )}
                </section>
            ))}
        </div>
    );
}
