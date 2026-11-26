export function indexBy<T, K>(
    rows: readonly T[],
    keyOf: (row: T) => K,
): Map<K, T> {
    return new Map(rows.map((row) => [keyOf(row), row]));
}

export function groupBy<T, K>(
    rows: readonly T[],
    keyOf: (row: T) => K,
): Map<K, T[]> {
    const groups = new Map<K, T[]>();

    for (const row of rows) {
        const key = keyOf(row);
        const group = groups.get(key);

        if (group === undefined) {
            groups.set(key, [row]);
        } else {
            group.push(row);
        }
    }

    return groups;
}

/** Plain code unit order: ISO days sort correctly and no locale rules apply. */
export function compareText(left: string, right: string): number {
    if (left === right) {
        return 0;
    }

    return left < right ? -1 : 1;
}

export function asciiLowerCase(value: string): string {
    return value.replace(/[A-Z]+/g, (letters) => letters.toLowerCase());
}

/** Sorts text the way SQLite's NOCASE does: only ASCII letters ignore case. */
export function compareAsciiNoCase(left: string, right: string): number {
    return compareText(asciiLowerCase(left), asciiLowerCase(right));
}
