import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import type { Locale } from '@/lib/i18n';
import { ENTERED_STORAGE_KEY } from '../src/shell/constants';
import { localIsoDate } from '../src/state/dates';
import { getState, loadState, saveState } from '../src/state/store';
import type {
    DemoState,
    DemoStateFile,
    DemoTables,
    ReadingSessionRow,
} from '../src/state/types';
import {
    type GoldenLocale,
    type GoldenPage,
    type Mismatch,
    comparePage,
    formatMismatch,
    loadGoldenPage,
    restoreClock,
    sendRequest,
} from './harness';

const EXPORT_FILE = new URL('../data/state.json', import.meta.url);
const STORAGE_KEY = 'releia-demo:state';
const DEMO_CLOCK = { time: '12:00:00', offset: '-03:00' };
const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})(?=$|[ T])/;
const JSON_CONTAINER = /^[[{]/;
const NOT_JSON = Symbol('not json');
const GOLDEN_LOCALES: readonly GoldenLocale[] = ['pt-BR', 'en'];
const APP_LOCALE: Record<GoldenLocale, Locale> = { 'pt-BR': 'pt_BR', en: 'en' };
const INVARIANT_PAGES = [
    { slug: 'home', url: '/' },
    { slug: 'queue', url: '/queue' },
    { slug: 'quick-log', url: '/quick-log' },
] as const;

const exportFile = JSON.parse(
    readFileSync(EXPORT_FILE, 'utf8'),
) as DemoStateFile;
const EXPORTED_ON = exportFile.exported_on;

type Audit = { dateLeaves: number; problems: string[] };

function addDays(isoDate: string, days: number): string {
    const [year, month, day] = isoDate.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, day + days))
        .toISOString()
        .slice(0, 10);
}

function shiftDateText(text: string, days: number): string {
    const [, year, month, day] = DATE_PREFIX.exec(text) ?? [];

    return `${addDays(`${year}-${month}-${day}`, days)}${text.slice(10)}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonText(text: string): unknown {
    if (!JSON_CONTAINER.test(text)) {
        return NOT_JSON;
    }

    try {
        return JSON.parse(text) as unknown;
    } catch {
        return NOT_JSON;
    }
}

function auditText(
    original: string,
    shifted: unknown,
    location: string,
    days: number,
    audit: Audit,
): void {
    const originalJson = parseJsonText(original);

    if (originalJson !== NOT_JSON) {
        const shiftedJson =
            typeof shifted === 'string' ? parseJsonText(shifted) : NOT_JSON;

        if (shiftedJson === NOT_JSON) {
            audit.problems.push(`${location}: JSON text lost its structure`);

            return;
        }

        auditValue(originalJson, shiftedJson, `${location}(json)`, days, audit);

        return;
    }

    if (DATE_PREFIX.test(original)) {
        audit.dateLeaves++;

        const expected = shiftDateText(original, days);

        if (shifted !== expected) {
            audit.problems.push(
                `${location}: expected ${expected}, got ${JSON.stringify(shifted)}`,
            );
        }

        return;
    }

    if (shifted !== original) {
        audit.problems.push(
            `${location}: not a date, yet changed to ${JSON.stringify(shifted)}`,
        );
    }
}

function auditArray(
    original: unknown[],
    shifted: unknown,
    location: string,
    days: number,
    audit: Audit,
): void {
    if (!Array.isArray(shifted) || shifted.length !== original.length) {
        audit.problems.push(`${location}: array length changed`);

        return;
    }

    original.forEach((item, index) =>
        auditValue(item, shifted[index], `${location}[${index}]`, days, audit),
    );
}

function auditObject(
    original: Record<string, unknown>,
    shifted: unknown,
    location: string,
    days: number,
    audit: Audit,
): void {
    if (!isPlainObject(shifted)) {
        audit.problems.push(`${location}: object became ${typeof shifted}`);

        return;
    }

    const keys = new Set([...Object.keys(original), ...Object.keys(shifted)]);

    for (const key of keys) {
        if (!Object.hasOwn(shifted, key)) {
            audit.problems.push(`${location}.${key}: column dropped`);
        } else if (!Object.hasOwn(original, key)) {
            audit.problems.push(`${location}.${key}: column added`);
        } else {
            auditValue(
                original[key],
                shifted[key],
                `${location}.${key}`,
                days,
                audit,
            );
        }
    }
}

/**
 * Every string that starts with a date must move by `days`; everything else must stay
 * put. Text that holds JSON is audited inside, so a date in settings.value is found too.
 */
function auditValue(
    original: unknown,
    shifted: unknown,
    location: string,
    days: number,
    audit: Audit,
): void {
    if (typeof original === 'string') {
        auditText(original, shifted, location, days, audit);
    } else if (Array.isArray(original)) {
        auditArray(original, shifted, location, days, audit);
    } else if (isPlainObject(original)) {
        auditObject(original, shifted, location, days, audit);
    } else if (!Object.is(original, shifted)) {
        audit.problems.push(
            `${location}: ${JSON.stringify(original)} became ${JSON.stringify(shifted)}`,
        );
    }
}

function auditTables(
    original: DemoStateFile['tables'],
    shifted: DemoState['tables'],
    days: number,
): Audit {
    const audit: Audit = { dateLeaves: 0, problems: [] };

    auditValue(original, shifted, 'tables', days, audit);

    return audit;
}

/**
 * The year goal counts the year of today (a shift past New Year starts a new year), and the
 * suggestion of the day is crc32(today) over the list. Both follow the calendar, not the data.
 */
const CALENDAR_DEPENDENT_PATH = /^props\.(goal|suggestion)(\.|$)/;

function isCalendarDependent(path: string): boolean {
    return CALENDAR_DEPENDENT_PATH.test(path);
}

function shiftDates(value: unknown, days: number): unknown {
    if (typeof value === 'string') {
        return DATE_PREFIX.test(value) ? shiftDateText(value, days) : value;
    }

    if (Array.isArray(value)) {
        return value.map((item) => shiftDates(item, days));
    }

    if (isPlainObject(value)) {
        return Object.fromEntries(
            Object.entries(value).map(([key, child]) => [
                key,
                shiftDates(child, days),
            ]),
        );
    }

    return value;
}

/** Sets the clock to noon of `isoDate` in the golden recorder's offset, as the harness does. */
function setClockOn(isoDate: string): void {
    const now = new Date(`${isoDate}T${DEMO_CLOCK.time}${DEMO_CLOCK.offset}`);

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);

    if (localIsoDate(now) !== isoDate) {
        throw new Error(
            `The clock reads ${localIsoDate(now)} in this timezone, not ${isoDate}.`,
        );
    }
}

/** A visit on `isoDate` through the real load path, from whatever the browser has saved. */
function visitOn(isoDate: string): DemoState {
    setClockOn(isoDate);

    return loadState(new Date());
}

function memoryStorage(): Storage {
    const items = new Map<string, string>();

    return {
        get length() {
            return items.size;
        },
        clear: () => items.clear(),
        getItem: (key) => items.get(key) ?? null,
        key: (index) => [...items.keys()][index] ?? null,
        removeItem: (key) => {
            items.delete(key);
        },
        setItem: (key, value) => {
            items.set(key, value);
        },
    };
}

function stubBrowserStorage(storage: Storage): void {
    vi.stubGlobal('window', { localStorage: storage });
    storage.setItem(ENTERED_STORAGE_KEY, 'true');
}

afterEach(() => {
    restoreClock();
    vi.unstubAllGlobals();
});

describe('shifting the export to the visitor day', () => {
    it.each([37, 400])('moves every date in every table by %i days', (days) => {
        const state = visitOn(addDays(EXPORTED_ON, days));
        const audit = auditTables(exportFile.tables, state.tables, days);

        expect(state.exported_on).toBe(addDays(EXPORTED_ON, days));
        expect(audit.problems.slice(0, 20)).toEqual([]);
        expect(audit.dateLeaves).toBeGreaterThan(0);
        process.stdout.write(
            `shift +${days}: ${audit.dateLeaves} date strings moved, all as expected\n`,
        );
    });

    it('leaves numbers and non-date text alone, year-valued numbers included', () => {
        const state = visitOn(addDays(EXPORTED_ON, 37));
        const yearly = state.tables.settings.find(
            (row) => row.key === 'yearly_goal',
        );

        expect(yearly?.value).toBe('12');
        expect(state.tables.books[0].published_year).toBe(
            exportFile.tables.books[0].published_year,
        );
    });
});

describe('relative numbers after the shift', () => {
    it('match the goldens once their dates move with the visit', () => {
        const days = 37;
        const visitDay = addDays(EXPORTED_ON, days);
        const mismatches: string[] = [];

        for (const locale of GOLDEN_LOCALES) {
            for (const { slug, url } of INVARIANT_PAGES) {
                const state = visitOn(visitDay);

                state.runtime.locale = APP_LOCALE[locale];

                const golden = loadGoldenPage(locale, slug);
                const shiftedGolden: GoldenPage = {
                    ...golden,
                    props: shiftDates(golden.props, days) as Record<
                        string,
                        unknown
                    >,
                };
                const response = sendRequest({ url });

                if (response.page === null) {
                    mismatches.push(
                        `${locale} ${slug}: no page, ${response.status}`,
                    );

                    continue;
                }

                const comparison = comparePage(shiftedGolden, response.page);

                for (const mismatch of comparison.mismatches as Mismatch[]) {
                    if (!isCalendarDependent(mismatch.path)) {
                        mismatches.push(
                            `${locale} ${slug} ${formatMismatch(mismatch)}`,
                        );
                    }
                }
            }
        }

        expect(mismatches).toEqual([]);
    });

    it('differs from the golden only where the calendar day itself decides the value', () => {
        const state = visitOn(addDays(EXPORTED_ON, 37));
        const golden = loadGoldenPage('en', 'home');
        const response = sendRequest({ url: '/' });
        const comparison = comparePage(
            {
                ...golden,
                props: shiftDates(golden.props, 37) as Record<string, unknown>,
            },
            response.page!,
        );
        const calendarDependent = comparison.mismatches
            .map((mismatch) => mismatch.path)
            .filter(isCalendarDependent);

        expect(state.exported_on).toBe(addDays(EXPORTED_ON, 37));
        expect(calendarDependent).toEqual(
            expect.arrayContaining([
                'props.goal.year',
                'props.goal.finished',
                'props.goal.projected',
            ]),
        );
    });
});

describe('visitor data saved in the browser', () => {
    const VISITOR_BOOK_ID = 10;
    const VISITOR_PAGE = 150;
    const VISIT_OFFSET = 37;
    const RETURN_GAP = 3;
    const OLDER_EXPORT = '2026-01-01';
    const EDITED_FINISH_TIME = ' 20:30:00';
    const seedReading = exportFile.tables.readings[0];
    const seedQueueItem = exportFile.tables.queue_items[0];
    const seedQueueItems = exportFile.tables.queue_items;

    type PersistedSnapshot = {
        exported_on: string;
        tables: DemoTables;
        runtime: { sourceExportedOn: string };
    };

    function persistedSnapshot(storage: Storage): PersistedSnapshot {
        const envelope = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null') as {
            state: PersistedSnapshot;
        };

        return envelope.state;
    }

    function logSession(): ReadingSessionRow {
        const saved = sendRequest({
            method: 'POST',
            url: '/quick-log',
            body: { book_id: VISITOR_BOOK_ID, page_to: VISITOR_PAGE },
        });

        expect(saved.status).toBe(200);

        const logged = getState().tables.reading_sessions.at(-1);

        if (logged === undefined) {
            throw new Error('The quick log did not add a session.');
        }

        return logged;
    }

    function returnAfter(visitDay: string, days: number): DemoState {
        return visitOn(addDays(visitDay, days));
    }

    it('is not shifted again when the visitor reloads on the same day', () => {
        const storage = memoryStorage();
        const visitDay = addDays(EXPORTED_ON, VISIT_OFFSET);

        stubBrowserStorage(storage);
        visitOn(visitDay);
        logSession();

        const persisted = persistedSnapshot(storage);

        expect(persisted.exported_on).toBe(visitDay);

        const reloaded = visitOn(visitDay);

        expect(JSON.parse(JSON.stringify(reloaded.tables))).toEqual(
            persisted.tables,
        );
    });

    it('keeps a session the visitor logged on its day, as a row the seed does not have', () => {
        const storage = memoryStorage();
        const visitDay = addDays(EXPORTED_ON, VISIT_OFFSET);

        stubBrowserStorage(storage);
        visitOn(visitDay);

        const logged = logSession();
        const returned = returnAfter(visitDay, RETURN_GAP);
        const kept = returned.tables.reading_sessions.find(
            (session) => session.id === logged.id,
        );

        expect(
            exportFile.tables.reading_sessions.some(
                (session) => session.id === logged.id,
            ),
        ).toBe(false);
        expect(kept?.read_on.slice(0, 10)).toBe(visitDay);
    });

    it('moves the seed dates with the demo when the visitor returns days later', () => {
        const storage = memoryStorage();
        const visitDay = addDays(EXPORTED_ON, VISIT_OFFSET);

        stubBrowserStorage(storage);
        visitOn(visitDay);
        logSession();
        saveState(getState());

        const returned = returnAfter(visitDay, RETURN_GAP);

        expect(returned.tables.readings[0].created_at).toBe(
            shiftDateText(seedReading.created_at, VISIT_OFFSET + RETURN_GAP),
        );
    });

    it('does not compound the seed dates over repeated returns', () => {
        const storage = memoryStorage();
        const visitDay = addDays(EXPORTED_ON, VISIT_OFFSET);

        stubBrowserStorage(storage);
        visitOn(visitDay);
        const logged = logSession();
        saveState(getState());
        returnAfter(visitDay, RETURN_GAP);
        saveState(getState());

        const lastReturn = returnAfter(visitDay, RETURN_GAP * 2);

        expect(lastReturn.tables.readings[0].created_at).toBe(
            shiftDateText(
                seedReading.created_at,
                VISIT_OFFSET + RETURN_GAP * 2,
            ),
        );
        expect(
            lastReturn.tables.reading_sessions
                .find((session) => session.id === logged.id)
                ?.read_on.slice(0, 10),
        ).toBe(visitDay);
        expect(returnAfter(visitDay, RETURN_GAP * 2).tables).toEqual(
            lastReturn.tables,
        );
    });

    it('keeps a seed date the visitor edited and still moves the other dates of that row', () => {
        const storage = memoryStorage();
        const visitDay = addDays(EXPORTED_ON, VISIT_OFFSET);
        const editedFinish = `${addDays(visitDay, -2)}${EDITED_FINISH_TIME}`;

        stubBrowserStorage(storage);
        visitOn(visitDay);
        getState().tables.readings[0].finished_at = editedFinish;
        saveState(getState());

        const returned = returnAfter(visitDay, RETURN_GAP);

        expect(returned.tables.readings[0].finished_at).toBe(editedFinish);
        expect(returned.tables.readings[0].created_at).toBe(
            shiftDateText(seedReading.created_at, VISIT_OFFSET + RETURN_GAP),
        );
    });

    it('does not bring back a seed row the visitor deleted, and moves the rest', () => {
        const storage = memoryStorage();
        const visitDay = addDays(EXPORTED_ON, VISIT_OFFSET);
        const remainingSeedItems = seedQueueItems.filter(
            (item) => item.id !== seedQueueItem.id,
        );

        stubBrowserStorage(storage);
        visitOn(visitDay);
        const state = getState();

        state.tables.queue_items = state.tables.queue_items.filter(
            (item) => item.id !== seedQueueItem.id,
        );
        saveState(state);

        const returned = returnAfter(visitDay, RETURN_GAP);

        expect(
            returned.tables.queue_items.some(
                (item) => item.id === seedQueueItem.id,
            ),
        ).toBe(false);
        expect(
            returned.tables.queue_items.map((item) => item.added_at),
        ).toEqual(
            remainingSeedItems.map((item) =>
                shiftDateText(item.added_at, VISIT_OFFSET + RETURN_GAP),
            ),
        );
    });

    it('discards the saved visit when the seed is re-exported', () => {
        const storage = memoryStorage();
        const visitDay = addDays(EXPORTED_ON, VISIT_OFFSET);

        stubBrowserStorage(storage);
        visitOn(visitDay);
        const logged = logSession();

        const envelope = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null') as {
            state: PersistedSnapshot;
        };

        envelope.state.runtime.sourceExportedOn = OLDER_EXPORT;
        storage.setItem(STORAGE_KEY, JSON.stringify(envelope));

        const returned = returnAfter(visitDay, RETURN_GAP);

        expect(
            returned.tables.reading_sessions.some(
                (session) => session.id === logged.id,
            ),
        ).toBe(false);
        expect(returned.tables.readings[0].created_at).toBe(
            shiftDateText(seedReading.created_at, VISIT_OFFSET + RETURN_GAP),
        );
    });
});
