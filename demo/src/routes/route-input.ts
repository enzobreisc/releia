import { forgetUndo } from '../domain/undo';
import { FormErrors } from '../support/form-errors';
import { successToast } from '../server/router';
import type { Toast } from '@/types';
import type { DemoState } from '../state/types';

const MAX_PAGE = 20000;
const MAX_MINUTES = 1440;

/** An id as the request sends it: a number, or digits in a string. */
export function integerOrNull(value: unknown): number | null {
    if (typeof value === 'number') {
        return Number.isInteger(value) ? value : null;
    }

    return typeof value === 'string' && /^\d+$/.test(value.trim())
        ? Number(value.trim())
        : null;
}

/** A list of distinct ids, or null when it is empty or any item is not an id. */
export function idsFromBody(value: unknown): number[] | null {
    if (!Array.isArray(value) || value.length === 0) {
        return null;
    }

    const ids = value
        .map(integerOrNull)
        .filter((id): id is number => id !== null);

    return ids.length === value.length && new Set(ids).size === ids.length
        ? ids
        : null;
}

/** A flag as the request sends it: booleans, 0/1, or "0"/"1". Null when it is none of these. */
export function flagOrNull(value: unknown): boolean | null {
    if (value === true || value === 1 || value === '1') {
        return true;
    }

    return value === false || value === 0 || value === '0' ? false : null;
}

/** Laravel's boolean cast for optional flags: "false", "0", "off", "no" and "" are false. */
export function truthyFlag(value: unknown): boolean {
    if (typeof value === 'string') {
        return !['', '0', 'false', 'off', 'no'].includes(value.toLowerCase());
    }

    return Boolean(value);
}

/** The messages of a page field: the one for a blank value and the one for a value out of range. */
export type PageMessages = { required: string; invalid: string };

export const SESSION_PAGE_MESSAGES: PageMessages = {
    required: 'Informe a página atual.',
    invalid: 'Número de página inválido.',
};

/**
 * A page from a form: an integer from `minimum` to the largest page the forms take. A value that
 * fails is reported on `errors` and returned as 0, which the caller never saves because it throws first.
 */
export function pageNumberOf(
    errors: FormErrors,
    field: string,
    value: unknown,
    minimum: number,
    messages: PageMessages = SESSION_PAGE_MESSAGES,
): number {
    if (value === null || value === undefined || value === '') {
        errors.add(field, messages.required);

        return 0;
    }

    const page = integerOrNull(value);

    if (page === null || page < minimum || page > MAX_PAGE) {
        errors.add(field, messages.invalid);

        return 0;
    }

    return page;
}

/** The book a form names: the id of a book that exists, else an error on the field and 0. */
export function bookIdOf(
    state: DemoState,
    errors: FormErrors,
    value: unknown,
): number {
    if (value === null || value === undefined || value === '') {
        errors.add('book_id', 'O campo livro é obrigatório.');

        return 0;
    }

    const bookId = integerOrNull(value);

    if (
        bookId === null ||
        !state.tables.books.some((book) => book.id === bookId)
    ) {
        errors.add('book_id', 'O valor escolhido para livro é inválido.');

        return 0;
    }

    return bookId;
}

/** The optional minutes of a session: blank is none, otherwise 1 to 1440. */
export function optionalMinutesOf(
    errors: FormErrors,
    value: unknown,
): number | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const minutes = integerOrNull(value);

    if (minutes === null || minutes < 1 || minutes > MAX_MINUTES) {
        errors.add('minutes', 'Informe entre 1 e 1440 minutos.');

        return null;
    }

    return minutes;
}

/** A success notice without undo: like Toast::success, it ends the undo of the action before. */
export function plainSuccessToast(
    title: string,
    sub: string | null = null,
): Toast {
    forgetUndo();

    return successToast(title, sub);
}
