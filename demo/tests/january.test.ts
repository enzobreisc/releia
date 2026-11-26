import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import type { Locale } from '@/lib/i18n';
import { localIsoDate } from '../src/state/dates';
import { loadState } from '../src/state/store';
import type { DemoStateFile } from '../src/state/types';
import { type ServedResponse, restoreClock, sendRequest } from './harness';

const EXPORT_FILE = new URL('../data/state.json', import.meta.url);
const DEMO_CLOCK = { time: '12:00:00', offset: '-03:00' };
const NEW_YEAR_MONTH_DAY = '-01-05';
const PREVIOUS_YEAR = 2026;
const VISITOR_LOCALE: Locale = 'pt_BR';

const exportFile = JSON.parse(
    readFileSync(EXPORT_FILE, 'utf8'),
) as DemoStateFile;

/** The first January 5 after the export day: the visitor's first look at a new year. */
function nextNewYearDay(exportedOn: string): string {
    const exportYear = Number(exportedOn.slice(0, 4));
    const isAfterNewYearDay = exportedOn.slice(4) >= NEW_YEAR_MONTH_DAY;

    return `${exportYear + Number(isAfterNewYearDay)}${NEW_YEAR_MONTH_DAY}`;
}

function visitOn(isoDate: string): void {
    const now = new Date(`${isoDate}T${DEMO_CLOCK.time}${DEMO_CLOCK.offset}`);

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);

    if (localIsoDate(now) !== isoDate) {
        throw new Error(
            `The clock reads ${localIsoDate(now)}, not ${isoDate}.`,
        );
    }

    const state = loadState(new Date());

    state.runtime.locale = VISITOR_LOCALE;
}

function pageProps(response: ServedResponse): Record<string, unknown> {
    return response.page?.props ?? {};
}

afterEach(() => {
    restoreClock();
});

describe('a visit on the first January 5 after the export', () => {
    const visitDay = nextNewYearDay(exportFile.exported_on);

    it('renders home, stats, wrapped, profile and timeline without a crash', () => {
        visitOn(visitDay);

        for (const url of [
            '/',
            '/stats',
            '/wrapped',
            '/profile',
            '/timeline',
        ]) {
            const response = sendRequest({ url });

            expect(response.status, url).toBe(200);
            expect(response.page, url).not.toBeNull();
        }
    });

    it('opens the year pages on the latest year with finished books', () => {
        visitOn(visitDay);

        const newYear = Number(visitDay.slice(0, 4));
        const home = pageProps(sendRequest({ url: '/' }));
        const stats = pageProps(sendRequest({ url: '/stats' }));
        const wrapped = pageProps(sendRequest({ url: '/wrapped' }));
        const profile = pageProps(sendRequest({ url: '/profile' }));

        expect(home.goal).toMatchObject({ year: newYear, finished: 0 });
        expect(stats.selected).toBe(String(PREVIOUS_YEAR));
        expect(wrapped.year).toBe(PREVIOUS_YEAR);
        expect(wrapped.summary).toMatchObject({ books_read: 8 });
        expect(profile.year).toBe(PREVIOUS_YEAR);
        expect(profile.year_books).toHaveLength(8);
    });

    it('still shows the new year when the visitor selects it', () => {
        visitOn(visitDay);

        const newYear = Number(visitDay.slice(0, 4));
        const stats = pageProps(sendRequest({ url: `/stats?year=${newYear}` }));
        const wrapped = pageProps(
            sendRequest({ url: `/wrapped?year=${newYear}` }),
        );
        const profile = pageProps(
            sendRequest({ url: `/profile?year=${newYear}` }),
        );

        expect(stats.selected).toBe(String(newYear));
        expect(wrapped.year).toBe(newYear);
        expect(wrapped.summary).toMatchObject({ books_read: 0 });
        expect(profile.year).toBe(newYear);
        expect(profile.year_books).toEqual([]);
    });

    it('still has last year finished books one selection away', () => {
        visitOn(visitDay);

        const wrapped = pageProps(
            sendRequest({ url: `/wrapped?year=${PREVIOUS_YEAR}` }),
        );
        const profile = pageProps(
            sendRequest({ url: `/profile?year=${PREVIOUS_YEAR}` }),
        );

        expect(wrapped.summary).toMatchObject({ books_read: 8 });
        expect(profile.year_books).toHaveLength(8);
    });
});
