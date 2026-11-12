import { Head } from '@inertiajs/react';
import { ActivitySection } from '@/components/profile/activity-section';
import { PinnedSection } from '@/components/profile/pinned-section';
import { ReaderCard } from '@/components/profile/reader-card';
import { ReadingCalendar } from '@/components/profile/reading-calendar';
import type {
    ActivityItem,
    GenreCount,
    PinOption,
    PinnedBook,
    Reader,
    ReaderTotals,
} from '@/components/profile/types';
import { YearShelf } from '@/components/profile/year-shelf';
import { useTranslation } from '@/hooks/use-translation';
import type { CalendarDay, Option, SpineBook } from '@/types';

type ProfileProps = {
    reader: Reader;
    locales: Option[];
    since: string;
    totals: ReaderTotals;
    genres: GenreCount[];
    avatar: number[];
    pinned: PinnedBook[];
    pin_options: PinOption[];
    pin_limit: number;
    year_books: SpineBook[];
    year: number;
    years: number[];
    calendar: CalendarDay[];
    year_summary: { reading_days: number; longest_streak: number };
    activity: ActivityItem[];
};

export default function Profile({
    reader,
    locales,
    since,
    totals,
    genres,
    avatar,
    pinned,
    pin_options,
    pin_limit,
    year_books,
    year,
    years,
    calendar,
    year_summary,
    activity,
}: ProfileProps) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Perfil')} />

            <div className="flex flex-wrap items-start gap-8">
                <ReaderCard
                    reader={reader}
                    locales={locales}
                    since={since}
                    totals={totals}
                    genres={genres}
                    avatar={avatar}
                />

                <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-8">
                    <PinnedSection
                        pinned={pinned}
                        options={pin_options}
                        limit={pin_limit}
                    />
                    <YearShelf books={year_books} year={year} />
                    <ReadingCalendar
                        calendar={calendar}
                        year={year}
                        years={years}
                        summary={year_summary}
                    />
                    <ActivitySection activity={activity} />
                </div>
            </div>
        </>
    );
}
