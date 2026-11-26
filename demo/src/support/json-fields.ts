export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function arrayOf(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

export function recordOf(value: unknown): Record<string, unknown> | null {
    return isRecord(value) ? value : null;
}

export function stringsOf(value: unknown): string[] {
    return arrayOf(value).filter(
        (item): item is string => typeof item === 'string',
    );
}
