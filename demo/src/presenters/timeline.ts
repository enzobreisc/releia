import type { TimelineReading, TimelineYear } from '@/types';
import { authorNamesOf, bookCoverUrl } from '../domain/books';
import type { ReadModel } from '../domain/read-model';
import { timelineYears, type TimelineEntry } from '../domain/timeline';

type TimelineProps = {
    today: string;
    years: TimelineYear[];
};

/** TimelinePresenter::entry */
function timelineReading(
    model: ReadModel,
    entry: TimelineEntry,
): TimelineReading {
    const { reading, book } = entry;

    return {
        id: reading.id,
        book_id: book.id,
        title: book.title,
        authors: authorNamesOf(model, book.id),
        cover_url: bookCoverUrl(book),
        status: reading.status,
        is_reread: entry.isReread,
        started_at: entry.startedOn,
        finished_at: entry.endedOn,
    };
}

export function timelineProps(model: ReadModel): TimelineProps {
    return {
        today: model.today,
        years: timelineYears(model).map(({ year, entries }) => ({
            year,
            readings: entries.map((entry) => timelineReading(model, entry)),
        })),
    };
}
