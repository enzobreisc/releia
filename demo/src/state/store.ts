import type { Locale } from '@/lib/i18n';
import { isRecord } from '../support/json-fields';
import { sha1Hex } from '../support/sha1';
import { localIsoDate } from './dates';
import { carryStateTo } from './shift';
import type {
    DemoRuntime,
    DemoState,
    DemoStateFile,
    DemoTables,
    LiveTimerState,
} from './types';

const STORAGE_KEY = 'releia-demo:state';
/** Bump when the saved shape changes, so an old save is discarded instead of misread. */
const STATE_SCHEMA_VERSION = 1;
const LOCALES: readonly Locale[] = ['pt_BR', 'en'];

const exportModules = import.meta.glob<DemoStateFile>('../../data/state.json', {
    eager: true,
    import: 'default',
});

const exportedFile: DemoStateFile | null =
    Object.values(exportModules)[0] ?? null;

/** A save is only restored into the export it was made from, so an edited export starts fresh. */
const EXPORT_FINGERPRINT =
    exportedFile === null ? 'no-export' : sha1Hex(JSON.stringify(exportedFile));

function seedFile(today: string): DemoStateFile {
    return exportedFile ?? { exported_on: today, tables: emptyTables() };
}

type PersistedState = Omit<DemoState, 'runtime'> & {
    runtime: Pick<DemoRuntime, 'sourceExportedOn' | 'locale' | 'liveTimer'>;
};

type StoredEnvelope = {
    schema: number;
    fingerprint: string;
    state: PersistedState;
};

let current: DemoState | null = null;

function emptyTables(): DemoTables {
    return {
        books: [],
        authors: [],
        author_book: [],
        bookshelves: [],
        readings: [],
        reading_sessions: [],
        notes: [],
        tags: [],
        note_tag: [],
        queue_items: [],
        shopping_items: [],
        recommendations: [],
        settings: [],
    };
}

/** The first visit follows the browser language, Portuguese unless it is English-only. */
function initialLocale(): Locale {
    try {
        return navigator.language.toLowerCase().startsWith('pt')
            ? 'pt_BR'
            : 'en';
    } catch {
        return 'pt_BR';
    }
}

function isPersistedState(value: unknown): value is PersistedState {
    if (!isRecord(value) || typeof value.exported_on !== 'string') {
        return false;
    }

    const { tables, runtime } = value;

    return (
        isRecord(tables) &&
        Object.keys(emptyTables()).every((name) =>
            Array.isArray(tables[name]),
        ) &&
        isRecord(runtime) &&
        typeof runtime.sourceExportedOn === 'string' &&
        LOCALES.includes(runtime.locale as Locale) &&
        (runtime.liveTimer === null || isRecord(runtime.liveTimer))
    );
}

function isCurrentEnvelope(value: unknown): value is StoredEnvelope {
    return (
        isRecord(value) &&
        value.schema === STATE_SCHEMA_VERSION &&
        value.fingerprint === EXPORT_FINGERPRINT &&
        isPersistedState(value.state)
    );
}

function removePersistedState(): void {
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nothing to clear when storage is blocked.
    }
}

/** A save from another version, or one that does not parse, is removed so it is never read again. */
function readPersistedState(): PersistedState | null {
    let raw: string | null;

    try {
        raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }

    if (raw === null) {
        return null;
    }

    try {
        const envelope: unknown = JSON.parse(raw);

        if (isCurrentEnvelope(envelope)) {
            return envelope.state;
        }
    } catch {
        // Fall through: an unparsable save is discarded like one from another version.
    }

    removePersistedState();

    return null;
}

function writePersistedState(state: PersistedState): void {
    const envelope: StoredEnvelope = {
        schema: STATE_SCHEMA_VERSION,
        fingerprint: EXPORT_FINGERPRINT,
        state,
    };

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    } catch {
        // Storage can be full or blocked; the demo then just forgets changes on reload.
    }
}

function stateFromExport(exportedOn: string): DemoState {
    return {
        exported_on: exportedOn,
        tables: structuredClone(exportedFile?.tables ?? emptyTables()),
        runtime: {
            sourceExportedOn: exportedOn,
            locale: initialLocale(),
            liveTimer: null,
            flashToast: null,
            quickLogSaved: null,
        },
    };
}

/** A timer saved before the book id and the pause fields existed cannot be counted, so it is dropped. */
function restorableTimer(timer: LiveTimerState | null): LiveTimerState | null {
    return timer !== null && 'paused_seconds' in timer ? timer : null;
}

function restoreState(
    persisted: PersistedState,
    exportedOn: string,
): DemoState {
    if (persisted.runtime.sourceExportedOn !== exportedOn) {
        return stateFromExport(exportedOn);
    }

    return {
        ...persisted,
        runtime: {
            ...persisted.runtime,
            liveTimer: restorableTimer(persisted.runtime.liveTimer),
            flashToast: null,
            quickLogSaved: null,
        },
    };
}

function restoredStateFor(
    seed: DemoStateFile,
    today: string,
): DemoState | null {
    const persisted = readPersistedState();

    if (persisted === null) {
        return null;
    }

    try {
        return carryStateTo(
            restoreState(persisted, seed.exported_on),
            seed,
            today,
        );
    } catch {
        removePersistedState();

        return null;
    }
}

export function loadState(now: Date): DemoState {
    const today = localIsoDate(now);
    const seed = seedFile(today);

    current =
        restoredStateFor(seed, today) ??
        carryStateTo(stateFromExport(seed.exported_on), seed, today);

    return current;
}

export function getState(): DemoState {
    current ??= loadState(new Date());

    return current;
}

export function saveState(state: DemoState): void {
    writePersistedState({
        exported_on: state.exported_on,
        tables: state.tables,
        runtime: {
            sourceExportedOn: state.runtime.sourceExportedOn,
            locale: state.runtime.locale,
            liveTimer: state.runtime.liveTimer,
        },
    });
}

/** Forgets the saved demo. The next visit starts again from the export. */
export function resetDemo(): void {
    removePersistedState();
    current = null;
}

/** Another tab saved the demo: this one takes over that state, so its next save does not undo it. */
export function followStoredStateChanges(): void {
    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY || event.key === null) {
            loadState(new Date());
        }
    });
}
