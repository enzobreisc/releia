import { phpTrim } from '../support/php-cast';
import { checkMaxLength, type FormErrors } from '../support/form-errors';
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

/** The text of a field: null when it is absent or empty. A text over its limit is an error on the field. */
function readText(
    errors: FormErrors,
    field: string,
    value: unknown,
    limit: number,
    text: string,
): string | null {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    if (typeof value !== 'string') {
        return null;
    }

    checkMaxLength(errors, field, value, limit, text);

    return value;
}

/** ProfileService::updateReader stores blank text as null. */
function cleaned(value: string | null): string | null {
    if (value === null) {
        return null;
    }

    const trimmed = phpTrim(value);

    return trimmed === '' ? null : trimmed;
}

/** UpdateProfileRequest: the name and the bio, each within its limit. */
export function readReaderInput(
    body: Record<string, unknown>,
    errors: FormErrors,
): ReaderInput {
    const name = readText(
        errors,
        'name',
        body.name,
        NAME_LIMIT,
        'O campo nome deve ter no máximo :max caracteres.',
    );
    const bio = readText(
        errors,
        'bio',
        body.bio,
        BIO_LIMIT,
        'O campo sobre você deve ter no máximo :max caracteres.',
    );

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
