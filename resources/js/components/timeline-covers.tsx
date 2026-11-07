import { Link } from '@inertiajs/react';
import { BookCover } from '@/components/book-cover';
import {
    RereadMark,
    useReadingTooltip,
    YearLabel,
} from '@/components/timeline-parts';
import { useTranslation } from '@/hooks/use-translation';
import { isOngoing } from '@/lib/timeline';
import { cn } from '@/lib/utils';
import { show } from '@/routes/books';
import type { TimelineReading } from '@/types';

function Book({ reading }: { reading: TimelineReading }) {
    const { t, shortDate } = useTranslation();
    const tooltip = useReadingTooltip();
    const isLive = isOngoing(reading);
    const endDate = shortDate(reading.finished_at ?? reading.started_at);

    function whenLabel(): string {
        if (isLive) {
            return t('lendo agora');
        }

        return reading.status === 'abandoned'
            ? t('parou em :date', { date: endDate })
            : endDate;
    }

    return (
        <Link
            href={show.url(reading.book_id)}
            title={tooltip(reading)}
            className={cn('flex flex-col gap-2', isLive ? 'w-[120px]' : 'w-24')}
        >
            <span
                className={cn(
                    'relative rounded-cover',
                    isLive && 'ring-[1.5px] ring-text',
                    reading.status === 'abandoned' && 'opacity-40',
                )}
            >
                <BookCover
                    src={reading.cover_url}
                    title={reading.title}
                    className="w-full"
                />
                {reading.is_reread && (
                    <RereadMark className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-bg/85 text-[11px]" />
                )}
            </span>
            <span className="font-mono text-[10px] text-faint">
                {whenLabel()}
            </span>
        </Link>
    );
}

export function TimelineCovers({
    groups,
}: {
    groups: { year: number; readings: TimelineReading[] }[];
}) {
    return (
        <div className="flex flex-col gap-11">
            {groups.map(({ year, readings }, position) => (
                <section
                    key={year}
                    aria-label={String(year)}
                    className="flex flex-col gap-[18px]"
                >
                    <div className="flex items-baseline gap-3.5">
                        <YearLabel year={year} position={position} />
                        <span className="h-px flex-1 bg-border" />
                    </div>
                    <div className="flex flex-wrap items-end gap-x-[18px] gap-y-[26px]">
                        {readings.map((reading) => (
                            <Book key={reading.id} reading={reading} />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
