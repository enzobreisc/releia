import { daysBetween, shiftTemporal } from './dates';
import type { DemoStateFile, DemoState, DemoTables, TableName } from './types';

/** Date and datetime columns of each table, so a shifted export still reads as current. */
const TEMPORAL_COLUMNS: Record<TableName, readonly string[]> = {
    books: ['created_at', 'updated_at'],
    authors: ['photo_looked_up_at', 'created_at', 'updated_at'],
    author_book: [],
    bookshelves: ['created_at', 'updated_at'],
    readings: ['started_at', 'finished_at', 'created_at', 'updated_at'],
    reading_sessions: ['read_on', 'created_at', 'updated_at'],
    notes: ['created_at', 'updated_at'],
    tags: ['created_at', 'updated_at'],
    note_tag: [],
    queue_items: ['added_at'],
    shopping_items: [
        'price_checked_at',
        'bought_at',
        'created_at',
        'updated_at',
    ],
    recommendations: ['created_at'],
    settings: ['created_at', 'updated_at'],
};

/** Settings are keyed by name; every other table is keyed by its id. */
const ROW_KEY_COLUMN: Partial<Record<TableName, string>> = {
    settings: 'key',
};
const DEFAULT_ROW_KEY_COLUMN = 'id';

function cellsOf(row: object): Map<string, unknown> {
    return new Map(Object.entries(row));
}

function rowKeyOf(table: TableName, row: object): string {
    const column = ROW_KEY_COLUMN[table] ?? DEFAULT_ROW_KEY_COLUMN;

    return String(cellsOf(row).get(column));
}

function shiftRow<T extends object>(
    row: T,
    columns: readonly string[],
    days: number,
): T {
    const entries = Object.entries(row).map(([column, value]) => [
        column,
        columns.includes(column) && typeof value === 'string'
            ? shiftTemporal(value, days)
            : value,
    ]);

    return Object.fromEntries(entries) as T;
}

function shiftTables(tables: DemoTables, days: number): DemoTables {
    const shifted = Object.entries(tables).map(([name, rows]) => {
        const columns = TEMPORAL_COLUMNS[name as TableName];

        return [name, rows.map((row) => shiftRow(row, columns, days))];
    });

    return Object.fromEntries(shifted) as DemoTables;
}

/** A date cell moves only while it still holds the seed's value; anything the visitor set stays. */
function carryRow<T extends object>(
    row: T,
    seedRow: T | undefined,
    columns: readonly string[],
    days: number,
): T {
    if (seedRow === undefined) {
        return row;
    }

    const seedCells = cellsOf(seedRow);
    const entries = Object.entries(row).map(([column, value]) => {
        const untouched =
            typeof value === 'string' && seedCells.get(column) === value;

        return [
            column,
            columns.includes(column) && untouched
                ? shiftTemporal(value, days)
                : value,
        ];
    });

    return Object.fromEntries(entries) as T;
}

function carryTable(
    table: TableName,
    rows: readonly object[],
    seedRows: readonly object[],
    days: number,
): object[] {
    const columns = TEMPORAL_COLUMNS[table];

    if (columns.length === 0) {
        return [...rows];
    }

    const seedRowByKey = new Map(
        seedRows.map((seedRow) => [rowKeyOf(table, seedRow), seedRow]),
    );

    return rows.map((row) =>
        carryRow(row, seedRowByKey.get(rowKeyOf(table, row)), columns, days),
    );
}

function carryTables(
    saved: DemoTables,
    seedAsSaved: DemoTables,
    days: number,
): DemoTables {
    const carried = Object.entries(saved).map(([name, rows]) => {
        const table = name as TableName;

        return [name, carryTable(table, rows, seedAsSaved[table], days)];
    });

    return Object.fromEntries(carried) as DemoTables;
}

/**
 * Moves a saved state from the day it was saved to `today`. Only the dates the seed still
 * holds move with the demo; rows the visitor created and dates the visitor changed keep theirs.
 */
export function carryStateTo(
    saved: DemoState,
    seed: DemoStateFile,
    today: string,
): DemoState {
    const days = daysBetween(saved.exported_on, today);

    if (days === 0) {
        return saved;
    }

    const seedAsSaved = shiftTables(
        seed.tables,
        daysBetween(seed.exported_on, saved.exported_on),
    );

    return {
        ...saved,
        exported_on: today,
        tables: carryTables(saved.tables, seedAsSaved, days),
    };
}
