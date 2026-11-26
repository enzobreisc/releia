const LEADING_NUMBER = /^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/;
const PHP_TRIM_CHARACTERS: ReadonlySet<string> = new Set([
    ' ',
    '\t',
    '\n',
    '\r',
    '\0',
    '\x0B',
]);

/** PHP's (int) cast of a string: its leading number, or 0 when it has none. */
export function intCast(text: string): number {
    const match = LEADING_NUMBER.exec(text);

    return match === null ? 0 : Math.trunc(Number(match[0]));
}

/** PHP's intval() of a decoded JSON value. */
export function intValue(value: unknown): number {
    if (typeof value === 'number') {
        return Math.trunc(value);
    }

    return typeof value === 'string' ? intCast(value) : 0;
}

/** PHP's trim(): only the whitespace characters PHP knows, not every Unicode space. */
export function phpTrim(text: string): string {
    let start = 0;
    let end = text.length;

    while (start < end && PHP_TRIM_CHARACTERS.has(text[start] ?? '')) {
        start++;
    }

    while (end > start && PHP_TRIM_CHARACTERS.has(text[end - 1] ?? '')) {
        end--;
    }

    return text.slice(start, end);
}
