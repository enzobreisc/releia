import type { DemoState, TableName } from '../state/types';
import { removeRows } from './cascade';

/** UndoService::TTL_SECONDS: an undo is offered for a minute. */
export const UNDO_TTL_SECONDS = 60;
const MILLISECONDS_PER_SECOND = 1000;
const TOKEN_LENGTH = 24;
const TOKEN_ALPHABET =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

type Row = Record<string, unknown>;

/**
 * Rows of a table the action may change. `key` is the id column that identifies a row,
 * or null for pivot tables, which are replaced as a whole inside `where`.
 */
type UndoScope = {
    table: TableName;
    where: Row;
    key: 'id' | null;
};

export type UndoSnapshot = (UndoScope & { rows: Row[] })[];

type RememberedUndo = {
    token: string;
    expiresAt: number;
    snapshot: UndoSnapshot;
};

/** Only the last action can be undone, so a single slot is enough. */
let remembered: RememberedUndo | null = null;

export function undoScope(
    table: TableName,
    where: Row = {},
    key: 'id' | null = 'id',
): UndoScope {
    return { table, where, key };
}

function matches(row: Row, where: Row): boolean {
    return Object.entries(where).every(
        ([column, value]) => row[column] === value,
    );
}

function tableRowsOf(state: DemoState): Record<TableName, Row[]> {
    return state.tables;
}

export function captureUndo(
    state: DemoState,
    scopes: readonly UndoScope[],
): UndoSnapshot {
    const tables = tableRowsOf(state);

    return scopes.map((scope) => ({
        ...scope,
        rows: tables[scope.table]
            .filter((row) => matches(row, scope.where))
            .map((row) => ({ ...row })),
    }));
}

function randomToken(): string {
    return Array.from(
        { length: TOKEN_LENGTH },
        () => TOKEN_ALPHABET[Math.floor(Math.random() * TOKEN_ALPHABET.length)],
    ).join('');
}

/** Stores the snapshot for the next undo and returns the token that restores it. */
export function rememberUndo(snapshot: UndoSnapshot): string {
    const token = randomToken();

    remembered = {
        token,
        expiresAt: Date.now() + UNDO_TTL_SECONDS * MILLISECONDS_PER_SECOND,
        snapshot,
    };

    return token;
}

/** A new action without undo ends the undo of the previous one. */
export function forgetUndo(): void {
    remembered = null;
}

function replaceKeyedRows(state: DemoState, part: UndoSnapshot[number]): void {
    const tables = tableRowsOf(state);
    const keptIds = new Set(part.rows.map((row) => Number(row.id)));
    const createdIds = tables[part.table]
        .filter((row) => matches(row, part.where))
        .map((row) => Number(row.id))
        .filter((id) => !keptIds.has(id));

    removeRows(state, part.table, new Set(createdIds));

    const current = tableRowsOf(state)[part.table];
    const restored = part.rows.map((row) => ({ ...row }));
    const restoredIds = new Set(restored.map((row) => Number(row.id)));
    const others = current.filter((row) => !restoredIds.has(Number(row.id)));

    tableRowsOf(state)[part.table] = [...others, ...restored].sort(
        (left, right) => Number(left.id) - Number(right.id),
    );
}

function replacePivotRows(state: DemoState, part: UndoSnapshot[number]): void {
    const tables = tableRowsOf(state);
    const others = tables[part.table].filter(
        (row) => !matches(row, part.where),
    );

    tables[part.table] = [...others, ...part.rows.map((row) => ({ ...row }))];
}

function restorePart(state: DemoState, part: UndoSnapshot[number]): void {
    if (part.key === null) {
        replacePivotRows(state, part);

        return;
    }

    replaceKeyedRows(state, part);
}

/**
 * Puts the snapshot's rows back. False when the token is not the last undoable action's,
 * or it has expired. Either way the stored undo is gone, as in UndoService::undo.
 */
export function restoreUndo(state: DemoState, token: string): boolean {
    const entry = remembered;

    if (entry === null || entry.token !== token) {
        return false;
    }

    remembered = null;

    if (entry.expiresAt < Date.now()) {
        return false;
    }

    for (const part of entry.snapshot) {
        restorePart(state, part);
    }

    return true;
}
