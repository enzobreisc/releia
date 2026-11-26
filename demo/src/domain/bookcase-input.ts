import { isShelfGrouping } from './bookcase';
import { isRecord } from '../support/json-fields';
import type { OrganizeInput, ShelfPlan } from './bookcase-commands';

/** InputLimits::NAME: the longest name a shelf or a bookcase can have. */
const NAME_MAX_LENGTH = 60;
const BOOKSHELF_KEY = 'bookshelf_id';
const INTEGER_TEXT = /^[+-]?\d+$/;
const LYING_DOWN_VALUES: readonly unknown[] = [true, 1, '1'];
const STANDING_VALUES: readonly unknown[] = [false, 0, '0'];

export type MoveInput = {
    beforeBookId: number | null;
    /** Null when the request did not send a shelf: the book keeps where it was. */
    placement: { bookshelfId: number | null } | null;
};

/** Laravel trims every string and turns an empty one into null before validation. */
function cleanText(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const text = value.trim();

    return text === '' ? null : text;
}

function shelfNameOf(value: unknown): string | null {
    const name = cleanText(value);

    return name !== null && Array.from(name).length <= NAME_MAX_LENGTH
        ? name
        : null;
}

/** Keeps the parsed items only when every one of them is valid. */
function parseEach<T>(
    items: unknown[],
    parse: (item: unknown) => T | null,
): T[] | null {
    const parsed = items.flatMap((item) => {
        const result = parse(item);

        return result === null ? [] : [result];
    });

    return parsed.length === items.length ? parsed : null;
}

/** Laravel's integer rule. Null when the value is not a whole number. */
export function toInteger(value: unknown): number | null {
    if (typeof value === 'number') {
        return Number.isInteger(value) ? value : null;
    }

    return typeof value === 'string' && INTEGER_TEXT.test(value)
        ? Number(value)
        : null;
}

/** Undefined when the value is present but not a whole number; null when it is absent or empty. */
function optionalInteger(value: unknown): number | null | undefined {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    return toInteger(value) ?? undefined;
}

export function parseShelfName(body: Record<string, unknown>): string | null {
    return shelfNameOf(body.name);
}

function parseGroupKeys(value: unknown): string[] | null {
    if (!Array.isArray(value) || value.length === 0) {
        return null;
    }

    return parseEach(value, cleanText);
}

function parseShelfPlan(item: unknown): ShelfPlan | null {
    if (!isRecord(item)) {
        return null;
    }

    const name = shelfNameOf(item.name);
    const groupKeys = parseGroupKeys(item.group_keys);

    return name === null || groupKeys === null ? null : { name, groupKeys };
}

function parseShelfPlans(value: unknown): ShelfPlan[] | null {
    return Array.isArray(value) ? parseEach(value, parseShelfPlan) : null;
}

/** OrganizeBookcaseRequest, for the grouping, the shelves and the catch-all name. */
export function parseOrganizeInput(
    body: Record<string, unknown>,
): OrganizeInput | null {
    const grouping = cleanText(body.grouping);
    const shelves = parseShelfPlans(body.shelves);
    const catchAllName = shelfNameOf(body.catch_all_name);

    if (
        !isShelfGrouping(grouping) ||
        shelves === null ||
        catchAllName === null
    ) {
        return null;
    }

    return { grouping, shelves, catchAllName };
}

/** MoveBookRequest. The shelf is checked only when the request sends the key. */
export function parseMoveInput(
    body: Record<string, unknown>,
): MoveInput | null {
    const beforeBookId = optionalInteger(body.before_book_id);

    if (beforeBookId === undefined) {
        return null;
    }

    if (!Object.hasOwn(body, BOOKSHELF_KEY)) {
        return { beforeBookId, placement: null };
    }

    const bookshelfId = optionalInteger(body[BOOKSHELF_KEY]);

    return bookshelfId === undefined
        ? null
        : { beforeBookId, placement: { bookshelfId } };
}

/** MergeBookshelfRequest: the id of the shelf to absorb, if it is a whole number. */
export function parseAbsorbedId(body: Record<string, unknown>): number | null {
    return toInteger(body.absorbed_id);
}

/** SetBookPostureRequest: Laravel's boolean rule, which takes these spellings only. */
export function parseLyingDown(body: Record<string, unknown>): boolean | null {
    if (LYING_DOWN_VALUES.includes(body.is_lying_down)) {
        return true;
    }

    return STANDING_VALUES.includes(body.is_lying_down) ? false : null;
}
