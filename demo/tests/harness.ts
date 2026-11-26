import { readFileSync } from 'node:fs';
import { vi } from 'vite-plus/test';
import type { Locale } from '@/lib/i18n';
import type { LiveSessionTimer } from '@/types';
import { stripBase } from '../src/server/base-path';
import {
    type DemoRequest,
    type DemoResponse,
    dispatch,
} from '../src/server/dispatch';
import type { HttpMethod } from '../src/server/router';
import { localIsoDate } from '../src/state/dates';
import { getState } from '../src/state/store';
import type {
    DemoState,
    DemoStateFile,
    LiveTimerState,
} from '../src/state/types';

export type GoldenLocale = 'pt-BR' | 'en';

type ManifestEntry = { slug: string; url: string };

export type GoldenPage = {
    component: string;
    url: string;
    props: Record<string, unknown>;
    sharedProps: string[];
};

type ServedPage = {
    component: string;
    url: string;
    props: Record<string, unknown>;
};

export type ServedResponse = {
    status: number;
    page: ServedPage | null;
    body: string;
};

type ScenarioRequest = {
    method?: HttpMethod;
    /** App path and query, without the base: "/library?sort=title". */
    url: string;
    body?: Record<string, unknown>;
    /** The page the request comes from. Defaults to `url`. */
    currentPath?: string;
};

export type Mismatch = {
    path: string;
    shared: boolean;
    expected: string;
    actual: string;
};

type Comparison = {
    mismatches: Mismatch[];
    extraPaths: string[];
};

type ResetOptions = {
    locale?: GoldenLocale;
    liveTimer?: LiveTimerState | null;
};

export type ScenarioStep = ScenarioRequest & {
    /** Golden slug, in the scenario's locale, that the resulting page is compared with. */
    golden?: string;
};

type ScenarioOptions = {
    locale?: GoldenLocale;
    /** Starts a live reading session, using the timer of the locale's golden live-session. */
    liveTimer?: boolean;
    steps: ScenarioStep[];
};

type ScenarioStepResult = {
    step: ScenarioStep;
    response: ServedResponse;
    comparison: Comparison | null;
};

type CaseOutcome = 'pass' | 'fail' | 'crash';

type CaseResult = {
    slug: string;
    locale: GoldenLocale;
    outcome: CaseOutcome;
    comparison: Comparison;
    error: string | null;
};

type SuiteReport = {
    results: CaseResult[];
    lines: string[];
    summary: string;
    failed: number;
};

type SuiteOptions = { slugFilter?: string };

const GOLDEN_ROOT = new URL('../golden/', import.meta.url);
const MANIFEST_FILE = new URL('manifest.json', GOLDEN_ROOT);
const EXPORT_FILE = new URL('../data/state.json', import.meta.url);

const GOLDEN_LOCALES: readonly GoldenLocale[] = ['pt-BR', 'en'];
const APP_LOCALE: Record<GoldenLocale, Locale> = { 'pt-BR': 'pt_BR', en: 'en' };
const LIVE_SLUGS: ReadonlySet<string> = new Set(['home-live', 'live-session']);
const LIVE_SESSION_SLUG = 'live-session';

/** The golden pages were recorded at noon in this offset, when the timers started. */
const DEMO_CLOCK = { time: '12:00:00', offset: '-03:00' };
const SUCCESS_STATUS = 200;
const MAX_REPORTED_MISMATCHES = 10;
const MAX_VALUE_LENGTH = 60;
const MISSING = Symbol('missing');
const MISSING_LABEL = '<missing>';

/** Toast ids are generated per flash message, so they can never match a golden page. */
const IGNORED_PATHS: ReadonlySet<string> = new Set(['props.toast.id']);

const exportFile = readJson<DemoStateFile>(EXPORT_FILE);

function readJson<T>(file: URL): T {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isServedPage(value: unknown): value is ServedPage {
    return (
        isPlainObject(value) &&
        typeof value.component === 'string' &&
        typeof value.url === 'string' &&
        isPlainObject(value.props)
    );
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Matches slugs against comma-separated patterns, where `*` is any run of characters. */
export function matchesSlugFilter(
    slug: string,
    filter: string | undefined,
): boolean {
    if (filter === undefined || filter.trim() === '') {
        return true;
    }

    return filter
        .split(',')
        .map((pattern) => pattern.trim())
        .filter((pattern) => pattern !== '')
        .some((pattern) => {
            const source = pattern.split('*').map(escapeRegExp).join('.*');

            return new RegExp(`^${source}$`).test(slug);
        });
}

function loadManifest(): ManifestEntry[] {
    return readJson<ManifestEntry[]>(MANIFEST_FILE);
}

export function loadGoldenPage(locale: GoldenLocale, slug: string): GoldenPage {
    const raw = readJson<
        Omit<GoldenPage, 'sharedProps'> & { sharedProps?: string[] }
    >(new URL(`${locale}/${slug}.json`, GOLDEN_ROOT));

    return {
        component: raw.component,
        url: raw.url,
        props: raw.props,
        sharedProps: raw.sharedProps ?? [],
    };
}

/** The timer a golden live-session page was recorded with, running and never paused. */
function liveTimerFromGolden(locale: GoldenLocale): LiveTimerState {
    const { props } = loadGoldenPage(locale, LIVE_SESSION_SLUG);
    const timer = props.timer as LiveSessionTimer;
    const reading = props.reading as { book_id: number };

    return {
        book_id: reading.book_id,
        start_page: timer.start_page,
        page: timer.page,
        started_at: timer.started_at,
        paused_at: null,
        paused_seconds: 0,
    };
}

function buildDemoState(
    locale: GoldenLocale,
    liveTimer: LiveTimerState | null,
): DemoState {
    return {
        exported_on: exportFile.exported_on,
        tables: structuredClone(exportFile.tables),
        runtime: {
            sourceExportedOn: exportFile.exported_on,
            locale: APP_LOCALE[locale],
            liveTimer,
            flashToast: null,
            quickLogSaved: null,
        },
    };
}

/**
 * The server reads "today" from the clock, so the clock is set to the export's day.
 * Fails if the machine's timezone puts that instant on another calendar day.
 */
function setDemoClock(): void {
    const now = new Date(
        `${exportFile.exported_on}T${DEMO_CLOCK.time}${DEMO_CLOCK.offset}`,
    );

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);

    if (localIsoDate(now) !== exportFile.exported_on) {
        throw new Error(
            `The demo clock reads ${localIsoDate(now)} in this timezone, not ${exportFile.exported_on}.`,
        );
    }
}

/**
 * Replaces the server's state with the export, unshifted, in the given locale. The
 * state object is the one the server reads, so no storage is involved.
 */
export function resetDemoState(options: ResetOptions = {}): void {
    setDemoClock();
    Object.assign(
        getState(),
        buildDemoState(options.locale ?? 'pt-BR', options.liveTimer ?? null),
    );
}

/** Puts the real clock back after a test has used resetDemoState. */
export function restoreClock(): void {
    vi.useRealTimers();
}

function parsePage(body: string): ServedPage | null {
    const parsed: unknown = JSON.parse(body);

    return isServedPage(parsed) ? parsed : null;
}

/** Runs one request through the same dispatch the app's fetch shim uses, as an Inertia visit would. */
export function sendRequest(request: ScenarioRequest): ServedResponse {
    const demoRequest: DemoRequest = {
        method: request.method ?? 'GET',
        url: request.url,
        body: request.body ?? {},
        headers: { 'x-inertia': 'true' },
        currentPath: request.currentPath ?? request.url,
    };
    const response: DemoResponse = dispatch(demoRequest);

    return {
        status: response.status,
        page: parsePage(response.body),
        body: response.body,
    };
}

type DiffScope = {
    sharedKeys: ReadonlySet<string>;
    mismatches: Mismatch[];
    extraPaths: string[];
};

function joinPath(path: string, key: string): string {
    return path === '' ? key : `${path}.${key}`;
}

function truncate(text: string): string {
    return text.length > MAX_VALUE_LENGTH
        ? `${text.slice(0, MAX_VALUE_LENGTH - 1)}…`
        : text;
}

function describeValue(value: unknown): string {
    if (value === MISSING) {
        return MISSING_LABEL;
    }

    return truncate(JSON.stringify(value) ?? 'undefined');
}

function isSharedPath(path: string, sharedKeys: ReadonlySet<string>): boolean {
    const topLevel = /^props\.([^.[]+)/.exec(path);

    return topLevel !== null && sharedKeys.has(topLevel[1]);
}

function recordMismatch(
    path: string,
    expected: unknown,
    actual: unknown,
    scope: DiffScope,
): void {
    scope.mismatches.push({
        path,
        shared: isSharedPath(path, scope.sharedKeys),
        expected: describeValue(expected),
        actual: describeValue(actual),
    });
}

function recordExtra(path: string, scope: DiffScope): void {
    if (!IGNORED_PATHS.has(path)) {
        scope.extraPaths.push(path);
    }
}

function diffArrays(
    expected: unknown[],
    actual: unknown[],
    path: string,
    scope: DiffScope,
): void {
    expected.forEach((item, index) => {
        const actualItem = index < actual.length ? actual[index] : MISSING;

        diffValues(item, actualItem, `${path}[${index}]`, scope);
    });

    for (let index = expected.length; index < actual.length; index++) {
        recordExtra(`${path}[${index}]`, scope);
    }
}

function diffObjects(
    expected: Record<string, unknown>,
    actual: Record<string, unknown>,
    path: string,
    scope: DiffScope,
): void {
    for (const [key, expectedChild] of Object.entries(expected)) {
        const actualChild = Object.hasOwn(actual, key) ? actual[key] : MISSING;

        diffValues(expectedChild, actualChild, joinPath(path, key), scope);
    }

    for (const key of Object.keys(actual)) {
        if (!Object.hasOwn(expected, key)) {
            recordExtra(joinPath(path, key), scope);
        }
    }
}

function diffValues(
    expected: unknown,
    actual: unknown,
    path: string,
    scope: DiffScope,
): void {
    if (IGNORED_PATHS.has(path)) {
        return;
    }

    if (actual === MISSING) {
        recordMismatch(path, expected, actual, scope);

        return;
    }

    if (Array.isArray(expected) && Array.isArray(actual)) {
        diffArrays(expected, actual, path, scope);

        return;
    }

    if (isPlainObject(expected) && isPlainObject(actual)) {
        diffObjects(expected, actual, path, scope);

        return;
    }

    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
        recordMismatch(path, expected, actual, scope);
    }
}

/** Compares the props the golden page has, plus its component and url. Extra props are reported apart. */
export function comparePage(golden: GoldenPage, page: ServedPage): Comparison {
    const scope: DiffScope = {
        sharedKeys: new Set(golden.sharedProps),
        mismatches: [],
        extraPaths: [],
    };

    diffValues(
        { component: golden.component, url: golden.url, props: golden.props },
        {
            component: page.component,
            url: stripBase(page.url),
            props: page.props,
        },
        '',
        scope,
    );

    return { mismatches: scope.mismatches, extraPaths: scope.extraPaths };
}

/** A non-200 status or a response without an Inertia page is a mismatch, like any prop. */
export function compareResponse(
    golden: GoldenPage,
    response: ServedResponse,
): Comparison {
    const statusMismatches: Mismatch[] =
        response.status === SUCCESS_STATUS
            ? []
            : [
                  {
                      path: 'status',
                      shared: false,
                      expected: String(SUCCESS_STATUS),
                      actual: String(response.status),
                  },
              ];

    if (response.page === null) {
        return {
            mismatches: [
                ...statusMismatches,
                {
                    path: 'page',
                    shared: false,
                    expected: describeValue(golden.component),
                    actual: `no Inertia page: ${truncate(response.body)}`,
                },
            ],
            extraPaths: [],
        };
    }

    const comparison = comparePage(golden, response.page);

    return {
        mismatches: [...statusMismatches, ...comparison.mismatches],
        extraPaths: comparison.extraPaths,
    };
}

export function formatMismatch(mismatch: Mismatch): string {
    const prefix = mismatch.shared ? '[shared] ' : '';

    return `${prefix}${mismatch.path}: expected ${mismatch.expected}, actual ${mismatch.actual}`;
}

/** Runs a sequence of requests from a fresh state. Steps with `golden` are compared with that page. */
export function runScenario(options: ScenarioOptions): ScenarioStepResult[] {
    const locale = options.locale ?? 'pt-BR';

    resetDemoState({
        locale,
        liveTimer: options.liveTimer ? liveTimerFromGolden(locale) : null,
    });

    return options.steps.map((step) => {
        const response = sendRequest(step);
        const comparison =
            step.golden === undefined
                ? null
                : compareResponse(
                      loadGoldenPage(locale, step.golden),
                      response,
                  );

        return { step, response, comparison };
    });
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function runCase(entry: ManifestEntry, locale: GoldenLocale): CaseResult {
    const base = { slug: entry.slug, locale };
    const noComparison: Comparison = { mismatches: [], extraPaths: [] };

    try {
        const golden = loadGoldenPage(locale, entry.slug);
        const liveTimer = LIVE_SLUGS.has(entry.slug)
            ? liveTimerFromGolden(locale)
            : null;

        resetDemoState({ locale, liveTimer });

        const comparison = compareResponse(
            golden,
            sendRequest({ url: entry.url }),
        );

        return {
            ...base,
            outcome: comparison.mismatches.length === 0 ? 'pass' : 'fail',
            comparison,
            error: null,
        };
    } catch (error) {
        return {
            ...base,
            outcome: 'crash',
            comparison: noComparison,
            error: errorMessage(error),
        };
    }
}

function caseLabel(result: CaseResult): string {
    return `${result.slug} [${result.locale}]`;
}

function reportLine(result: CaseResult): string | null {
    const { comparison } = result;
    const extras =
        comparison.extraPaths.length === 0
            ? ''
            : ` | extra props: ${comparison.extraPaths.join(', ')}`;

    if (result.outcome === 'crash') {
        return `CRASH ${caseLabel(result)}: ${result.error}`;
    }

    if (result.outcome === 'fail') {
        const shown = comparison.mismatches
            .slice(0, MAX_REPORTED_MISMATCHES)
            .map(formatMismatch);
        const hidden = comparison.mismatches.length - MAX_REPORTED_MISMATCHES;
        const more = hidden > 0 ? `; ... ${hidden} more` : '';

        return `FAIL ${caseLabel(result)} (${comparison.mismatches.length} mismatches): ${shown.join('; ')}${more}${extras}`;
    }

    return extras === ''
        ? null
        : `EXTRA ${caseLabel(result)}: ${comparison.extraPaths.join(', ')}`;
}

function summarize(results: CaseResult[]): string {
    const passed = results.filter((r) => r.outcome === 'pass').length;
    const crashed = results.filter((r) => r.outcome === 'crash').length;
    const failed = results.length - passed;
    const withExtras = results.filter(
        (r) => r.comparison.extraPaths.length > 0,
    ).length;
    const perLocale = GOLDEN_LOCALES.map((locale) => {
        const local = results.filter((r) => r.locale === locale);
        const localPassed = local.filter((r) => r.outcome === 'pass').length;

        return `${locale} ${localPassed}/${local.length}`;
    }).join(', ');

    return `Golden pages: ${passed} passed, ${failed} failed (${crashed} crashed), ${results.length} total [passed: ${perLocale}]. Extra props on ${withExtras} pages.`;
}

/** Compares every manifest page in both locales with the server's output. Never throws on a mismatch. */
export function runGoldenSuite(options: SuiteOptions = {}): SuiteReport {
    const entries = loadManifest().filter((entry) =>
        matchesSlugFilter(entry.slug, options.slugFilter),
    );

    if (entries.length === 0) {
        throw new Error(
            `No golden page matches DEMO_SLUGS="${options.slugFilter}".`,
        );
    }

    const results = entries.flatMap((entry) =>
        GOLDEN_LOCALES.map((locale) => runCase(entry, locale)),
    );
    const lines = results
        .map(reportLine)
        .filter((line): line is string => line !== null);

    return {
        results,
        lines,
        summary: summarize(results),
        failed: results.filter((r) => r.outcome !== 'pass').length,
    };
}

type ReplayStep = {
    step: string;
    method?: HttpMethod;
    url: string;
    body?: Record<string, unknown>;
    golden: string;
    dumped: string[];
    seconds_elapsed?: number;
};

type ReplayCheck = {
    label: string;
    comparison: Comparison;
};

type ReplayOptions = {
    /** Checks every page the recorder dumped, not only the book pages. */
    allDumps?: boolean;
};

type ReplayReport = {
    text: string;
    summary: string;
    failing: number;
};

const SCENARIO_FILE = new URL('scenarios.json', GOLDEN_ROOT);
const SCENARIO_STEPS = readJson<Record<string, ReplayStep[]>>(SCENARIO_FILE);
const HOME_PATH = '/';
const HOME_SLUG = 'home';
const LIBRARY_ADD_SLUG = 'library-add';
const UNDO_PLACEHOLDER = 'undo-token';
const BOOK_SLUG = /^book-(\d+)$/;
const MAX_REPLAY_MISMATCHES = 10;
const MILLISECONDS_PER_SECOND = 1000;
/**
 * The golden recorder (demo/export/scenario_runner.php) moved the clock by each step's
 * seconds twice: Carbon and CarbonImmutable share one test clock, so both setTestNow
 * calls advance it. The goldens hold the minutes that clock produced.
 */
const RECORDED_CLOCK_PASSES = 2;

function advanceRecordedClock(seconds: number): void {
    vi.setSystemTime(
        new Date(
            Date.now() +
                seconds * RECORDED_CLOCK_PASSES * MILLISECONDS_PER_SECOND,
        ),
    );
}

function pathOfSlug(slug: string): string {
    const book = BOOK_SLUG.exec(slug);

    if (book !== null) {
        return `/library/${book[1]}`;
    }

    if (slug === HOME_SLUG) {
        return HOME_PATH;
    }

    return slug === LIBRARY_ADD_SLUG ? '/library/add' : `/${slug}`;
}

function readScenarioGolden(
    locale: GoldenLocale,
    scenario: string,
    step: string,
    slug: string,
): GoldenPage {
    const raw = readJson<
        Omit<GoldenPage, 'sharedProps'> & { sharedProps?: string[] }
    >(
        new URL(
            `${locale}/scenarios/${scenario}/${step}-${slug}.json`,
            GOLDEN_ROOT,
        ),
    );

    return {
        component: raw.component,
        url: raw.url,
        props: raw.props,
        sharedProps: raw.sharedProps ?? [],
    };
}

/** The undo token a served page offers, or null. */
function undoOffered(page: ServedPage | null): string | null {
    const toast = page?.props.toast;

    if (typeof toast !== 'object' || toast === null) {
        return null;
    }

    const undo = (toast as { undo?: unknown }).undo;

    return typeof undo === 'string' ? undo : null;
}

/** Puts the placeholder back where the served page carries a random undo token. */
function withUndoPlaceholder(response: ServedResponse): ServedResponse {
    const token = undoOffered(response.page);

    if (response.page === null || token === null) {
        return response;
    }

    const toast = response.page.props.toast as Record<string, unknown>;

    return {
        ...response,
        page: {
            ...response.page,
            props: {
                ...response.page.props,
                toast: { ...toast, undo: UNDO_PLACEHOLDER },
            },
        },
    };
}

function shouldCheckDump(slug: string, options: ReplayOptions): boolean {
    return options.allDumps === true || BOOK_SLUG.test(slug);
}

/**
 * Replays a golden scenario through the server, step by step, with the clock the recorder
 * had. Each landed page, and each dumped page that is checked, is compared with its golden.
 */
export function replayScenario(
    locale: GoldenLocale,
    scenario: string,
    options: ReplayOptions = {},
): ReplayCheck[] {
    const steps = SCENARIO_STEPS[scenario] ?? [];
    const checks: ReplayCheck[] = [];

    resetDemoState({ locale });

    let currentPath = HOME_PATH;
    let undoToken: string | null = null;

    for (const step of steps) {
        if (step.seconds_elapsed !== undefined) {
            advanceRecordedClock(step.seconds_elapsed);
        }

        const url =
            undoToken === null
                ? step.url
                : step.url.replace(UNDO_PLACEHOLDER, undoToken);
        const response = sendRequest({
            method: step.method ?? 'GET',
            url,
            body: step.body ?? {},
            currentPath,
        });

        checks.push({
            label: `landed ${scenario}/${step.step} [${locale}]`,
            comparison: compareResponse(
                readScenarioGolden(locale, scenario, step.step, step.golden),
                withUndoPlaceholder(response),
            ),
        });

        for (const slug of step.dumped) {
            if (slug === step.golden || !shouldCheckDump(slug, options)) {
                continue;
            }

            const dumped = sendRequest({ url: pathOfSlug(slug), currentPath });

            checks.push({
                label: `dumped ${scenario}/${step.step}/${slug} [${locale}]`,
                comparison: compareResponse(
                    readScenarioGolden(locale, scenario, step.step, slug),
                    withUndoPlaceholder(dumped),
                ),
            });
        }

        undoToken = undoOffered(response.page);
        currentPath =
            response.page === null ? currentPath : stripBase(response.page.url);
    }

    return checks;
}

function describeFailure(check: ReplayCheck): string {
    const shown = check.comparison.mismatches.slice(0, MAX_REPLAY_MISMATCHES);

    return `FAIL ${check.label}: ${shown.map(formatMismatch).join('; ')}`;
}

/** The failing checks, then a summary that counts the landed and the dumped pages that passed. */
export function reportReplay(
    scenario: string,
    locale: GoldenLocale,
    checks: ReplayCheck[],
): ReplayReport {
    const failing = checks.filter(
        (check) => check.comparison.mismatches.length > 0,
    );
    const landed = checks.filter((check) => check.label.startsWith('landed'));
    const dumped = checks.filter((check) => check.label.startsWith('dumped'));
    const passed = (group: ReplayCheck[]): number =>
        group.filter((check) => check.comparison.mismatches.length === 0)
            .length;
    const summary = `${scenario} [${locale}]: landed ${passed(landed)}/${landed.length} passed, dumped pages ${passed(dumped)}/${dumped.length} passed`;
    const lines = failing.map(describeFailure);

    return {
        text: `${[...lines, summary].join('\n')}\n`,
        summary,
        failing: failing.length,
    };
}
