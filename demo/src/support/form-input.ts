import { intCast, intValue, phpTrim } from './php-cast';

/** ConvertEmptyStringsToNull after TrimStrings: a blank field is null. */
export function optionalText(value: unknown): string | null {
    if (typeof value === 'number') {
        return String(value);
    }

    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = phpTrim(value);

    return trimmed === '' ? null : trimmed;
}

export function requiredText(value: unknown): string {
    return optionalText(value) ?? '';
}

/** An integer field: null when it is absent or blank, as the form leaves it. */
export function optionalInteger(value: unknown): number | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'string' && phpTrim(value) === '') {
        return null;
    }

    return typeof value === 'string' ? intCast(value) : intValue(value);
}

/** One of the allowed values, or null: the enum rule of a form request. */
export function enumOf<T extends string>(
    value: unknown,
    allowed: readonly T[],
): T | null {
    return allowed.find((option) => option === value) ?? null;
}

export function flagOf(value: unknown): boolean {
    return value === true || value === 1 || value === '1' || value === 'true';
}

/** Authors come as a comma separated text or as a list, and blank names are dropped. */
export function nameList(value: unknown): string[] {
    const names = Array.isArray(value)
        ? value.filter((name): name is string => typeof name === 'string')
        : (optionalText(value) ?? '').split(',');

    return names.map(phpTrim).filter((name) => name !== '');
}
