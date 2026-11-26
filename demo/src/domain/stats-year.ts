import { yearOf } from '../support/day';
import type { ReadModel } from './read-model';
import { concludedReadings } from './stats-books';
import { yearPeriod, yearsWithActivity } from './stats-period';

function hasFinishedBooks(model: ReadModel, year: number): boolean {
    return concludedReadings(model, yearPeriod(year, model.today)).length > 0;
}

/**
 * The year shown when the visitor names none. A new year has no finished books yet, so the
 * page falls back to the latest year that has some; an explicit request is never changed.
 */
export function defaultYear(model: ReadModel): number {
    const currentYear = yearOf(model.today);

    if (hasFinishedBooks(model, currentYear)) {
        return currentYear;
    }

    return (
        yearsWithActivity(model).find((year) =>
            hasFinishedBooks(model, year),
        ) ?? currentYear
    );
}
