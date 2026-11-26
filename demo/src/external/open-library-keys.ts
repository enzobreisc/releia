const COVER_URL = 'https://covers.openlibrary.org/b/id';
const WORK_KEY = /^\/works\/(OL\d+W)$/;

export function workKeyOf(key: unknown): string | null {
    const match = typeof key === 'string' ? WORK_KEY.exec(key) : null;

    return match?.[1] ?? null;
}

export function coverUrlOf(coverId: number | null): string | null {
    return coverId === null ? null : `${COVER_URL}/${coverId}-L.jpg`;
}
