import { phpTrim } from '../support/php-cast';
import type { ReadModel } from './read-model';
import {
    MAX_PINS,
    PINS_SETTING,
    pinnedIds,
    READER_SETTING,
} from './profile-reads';
import { writeSetting } from './settings';

const NAME_LIMIT = 60;
const BIO_LIMIT = 160;

type ReaderInput = { name: string | null; bio: string | null };

/** null when the value is absent or empty, undefined when the rule rejects it. */
function readText(value: unknown, limit: number): string | null | undefined {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    return typeof value === 'string' && Array.from(value).length <= limit
        ? value
        : undefined;
}

/** ProfileService::updateReader stores blank text as null. */
function cleaned(value: string | null): string | null {
    if (value === null) {
        return null;
    }

    const trimmed = phpTrim(value);

    return trimmed === '' ? null : trimmed;
}

/** The UpdateProfileRequest rules; null when they reject the request. */
export function readReaderInput(
    body: Record<string, unknown>,
): ReaderInput | null {
    const name = readText(body.name, NAME_LIMIT);
    const bio = readText(body.bio, BIO_LIMIT);

    if (name === undefined || bio === undefined) {
        return null;
    }

    return { name: cleaned(name), bio: cleaned(bio) };
}

export function saveReader(model: ReadModel, input: ReaderInput): void {
    writeSetting(model.state, READER_SETTING, input, model.today);
}

/** Pinning a book already pinned is allowed; a new pin needs a free slot. */
export function canPin(model: ReadModel, bookId: number): boolean {
    const ids = pinnedIds(model);

    return ids.includes(bookId) || ids.length < MAX_PINS;
}

export function pinBook(model: ReadModel, bookId: number): void {
    const ids = pinnedIds(model);

    if (ids.includes(bookId)) {
        return;
    }

    writeSetting(model.state, PINS_SETTING, [...ids, bookId], model.today);
}

export function unpinBook(model: ReadModel, bookId: number): void {
    writeSetting(
        model.state,
        PINS_SETTING,
        pinnedIds(model).filter((id) => id !== bookId),
        model.today,
    );
}
