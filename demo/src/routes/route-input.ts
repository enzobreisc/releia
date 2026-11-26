import { forgetUndo } from '../domain/undo';
import { WriteRejected } from '../domain/reading-writes';
import { successToast } from '../server/router';
import type { Toast } from '@/types';
import type { DemoState } from '../state/types';
import { translateFor } from './flash';

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

/** A page from a form: an integer from `minimum` to the largest page the forms take. */
export function pageNumberOf(
    state: DemoState,
    value: unknown,
    minimum: number,
): number {
    const page = integerOrNull(value);

    if (page === null || page < minimum || page > MAX_PAGE) {
        throw new WriteRejected(
            translateFor(state, 'Número de página inválido.'),
        );
    }

    return page;
}

/** The optional minutes of a session: blank is none, otherwise 1 to 1440. */
export function optionalMinutesOf(
    state: DemoState,
    value: unknown,
): number | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const minutes = integerOrNull(value);

    if (minutes === null || minutes < 1 || minutes > MAX_MINUTES) {
        throw new WriteRejected(
            translateFor(state, 'Informe entre 1 e 1440 minutos.'),
        );
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
