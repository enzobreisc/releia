import { Link } from '@inertiajs/react';
import {
    barClass,
    MONTH_COUNT,
    RereadMark,
    useReadingTooltip,
    YearLabel,
} from '@/components/timeline-parts';
import { useTranslation } from '@/hooks/use-translation';
import { yearFraction } from '@/lib/timeline';
import type { Segment, YearLane } from '@/lib/timeline';
import { cn } from '@/lib/utils';
import { show } from '@/routes/books';

const LANE_HEIGHT = 34;
const LANE_PADDING = 12;
const MIN_BAR_WIDTH = '10px';
const LABEL_MIN_SPAN = 0.06;

const MONTH_GRID = `repeating-linear-gradient(90deg, var(--color-surface) 0, var(--color-surface) calc(100% / ${MONTH_COUNT} - 1px), var(--color-active) calc(100% / ${MONTH_COUNT} - 1px), var(--color-active) calc(100% / ${MONTH_COUNT}))`;

function percent(fraction: number): string {
    return `${(fraction * 100).toFixed(2)}%`;
}

function Bar({ segment }: { segment: Segment }) {
    const tooltip = useReadingTooltip();
    const { reading, from, to, lane } = segment;
    const showsTitle = to - from > LABEL_MIN_SPAN;

    return (
        <Link
            href={show.url(reading.book_id)}
            title={tooltip(reading)}
            aria-label={tooltip(reading)}
            className={cn(
                'absolute flex h-[26px] items-center gap-1.5 overflow-hidden rounded-cover px-2 text-[11px] font-extrabold whitespace-nowrap text-text shadow-cover',
                barClass(reading.status),
            )}
            style={{
                left: percent(from),
                width: `max(${MIN_BAR_WIDTH}, ${percent(to - from)})`,
                top: LANE_PADDING + lane * LANE_HEIGHT,
            }}
        >
            {reading.is_reread && <RereadMark />}
            {showsTitle && <span className="truncate">{reading.title}</span>}
        </Link>
    );
}

function YearRow({
    lane,
    position,
    today,
    monthNames,
    caption,
}: {
    lane: YearLane;
    position: number;
    today: string;
    monthNames: string[];
    caption: string;
}) {
    const { t } = useTranslation();
    const hasToday = Number(today.slice(0, 4)) === lane.year;
    const todayLeft = percent(yearFraction(today));

    return (
        <section
            aria-label={String(lane.year)}
            className="grid grid-cols-[minmax(84px,120px)_minmax(0,1fr)] items-start gap-5"
        >
            <div className="flex flex-col gap-1 pt-[18px]">
                <YearLabel year={lane.year} position={position} />
                <span className="text-xs font-semibold text-faint">
                    {caption}
                </span>
            </div>
            <div className="overflow-x-auto">
                <div className="flex min-w-[640px] flex-col gap-2">
                    <div className="grid grid-cols-12 font-mono text-[10px] text-faint">
                        {monthNames.map((name) => (
                            <span
                                key={name}
                                className="border-l border-border pl-1"
                            >
                                {name}
                            </span>
                        ))}
                    </div>
                    <div
                        className="relative rounded-[14px]"
                        style={{
                            height: 24 + lane.laneCount * LANE_HEIGHT,
                            background: MONTH_GRID,
                        }}
                    >
                        {hasToday && (
                            <>
                                <span
                                    aria-hidden="true"
                                    className="absolute -top-1.5 -bottom-1.5 w-0.5 rounded-full bg-accent"
                                    style={{ left: todayLeft }}
                                />
                                <span
                                    className="absolute -bottom-6 -translate-x-1/2 font-mono text-[10px] text-link"
                                    style={{ left: todayLeft }}
                                >
                                    {t('hoje')}
                                </span>
                            </>
                        )}
                        {lane.segments.map((segment) => (
                            <Bar
                                key={`${segment.reading.id}-${lane.year}`}
                                segment={segment}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

export function TimelineLanes({
    lanes,
    today,
    monthNames,
}: {
    lanes: YearLane[];
    today: string;
    monthNames: string[];
}) {
    const { t } = useTranslation();
    const oldestYear = lanes[lanes.length - 1]?.year;
    const currentYear = Number(today.slice(0, 4));

    function captionFor(year: number): string {
        if (year === currentYear) {
            return t('até hoje');
        }

        return year === oldestYear ? t('quando tudo começou') : '';
    }

    return (
        <div className="flex flex-col gap-10">
            {lanes.map((lane, position) => (
                <YearRow
                    key={lane.year}
                    lane={lane}
                    position={position}
                    today={today}
                    monthNames={monthNames}
                    caption={captionFor(lane.year)}
                />
            ))}
        </div>
    );
}
