import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {
    followStoredStateChanges,
    getState,
    loadState,
    saveState,
} from '../src/state/store';
import type { LiveTimerState } from '../src/state/types';

const NOW = new Date();
const SHA1_HEX = /^[0-9a-f]{40}$/;
const TIMER: LiveTimerState = {
    book_id: 1,
    start_page: 1,
    page: 2,
    started_at: '2026-11-26 10:00:00',
    paused_at: null,
    paused_seconds: 0,
};

type Listener = (event: { key: string | null }) => void;

const storage = new Map<string, string>();
const listeners: Listener[] = [];

function storedKey(): string {
    return [...storage.keys()][0] ?? '';
}

function storedEnvelope(): Record<string, unknown> {
    return JSON.parse(storage.get(storedKey()) ?? 'null') as Record<
        string,
        unknown
    >;
}

function saveWithTimer(): void {
    const state = loadState(NOW);
    state.runtime.liveTimer = TIMER;
    saveState(state);
}

beforeEach(() => {
    storage.clear();
    listeners.length = 0;
    vi.stubGlobal('window', {
        localStorage: {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
            removeItem: (key: string) => storage.delete(key),
        },
        addEventListener: (_type: string, listener: Listener) =>
            listeners.push(listener),
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('saved demo state', () => {
    it('restores a save written for the same export', () => {
        saveWithTimer();

        expect(loadState(NOW).runtime.liveTimer).toMatchObject({ page: 2 });
    });

    it('writes the schema version and an export fingerprint with the state', () => {
        saveWithTimer();
        const envelope = storedEnvelope();

        expect(envelope.schema).toBe(1);
        expect(String(envelope.fingerprint)).toMatch(SHA1_HEX);
    });

    it('discards a save made for another export fingerprint', () => {
        saveWithTimer();
        const envelope = storedEnvelope();
        storage.set(
            storedKey(),
            JSON.stringify({ ...envelope, fingerprint: 'another-export' }),
        );

        expect(loadState(NOW).runtime.liveTimer).toBeNull();
        expect(storage.has(storedKey())).toBe(false);
    });

    it('discards a save written with another schema version', () => {
        saveWithTimer();
        const envelope = storedEnvelope();
        storage.set(storedKey(), JSON.stringify({ ...envelope, schema: 0 }));

        expect(loadState(NOW).runtime.liveTimer).toBeNull();
    });

    it('discards a save whose tables are malformed without throwing', () => {
        saveWithTimer();
        const envelope = storedEnvelope() as {
            state: { tables: Record<string, unknown> };
        };
        delete envelope.state.tables.books;
        storage.set(storedKey(), JSON.stringify(envelope));

        expect(() => loadState(NOW)).not.toThrow();
        expect(getState().runtime.liveTimer).toBeNull();
    });

    it('discards a save that does not parse', () => {
        storage.set('releia-demo:state', '{not json');

        expect(() => loadState(NOW)).not.toThrow();
        expect(storage.size).toBe(0);
    });

    it('takes over a save another tab wrote', () => {
        saveWithTimer();
        const otherTabEnvelope = JSON.stringify(storedEnvelope());
        storage.clear();
        followStoredStateChanges();
        loadState(NOW);
        expect(getState().runtime.liveTimer).toBeNull();

        storage.set('releia-demo:state', otherTabEnvelope);
        listeners.forEach((listener) => listener({ key: 'releia-demo:state' }));

        expect(getState().runtime.liveTimer).toMatchObject({ page: 2 });
    });

    it('ignores storage events for other keys', () => {
        followStoredStateChanges();
        loadState(NOW);

        listeners.forEach((listener) => listener({ key: 'other-key' }));

        expect(getState().runtime.liveTimer).toBeNull();
    });
});
