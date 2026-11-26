import type { HttpMethod } from './router';
import { isRecord } from '../support/json-fields';

/** Repeated keys become arrays, as a server reading the same form would see them. */
export function formDataToObject(form: FormData): Record<string, unknown> {
    const body: Record<string, unknown> = {};

    for (const [key, value] of form.entries()) {
        const existing = body[key];

        if (existing === undefined) {
            body[key] = value;
        } else {
            body[key] = Array.isArray(existing)
                ? [...existing, value]
                : [existing, value];
        }
    }

    return body;
}

/** Accepts what Inertia and fetch send: an object, a FormData, or JSON text. */
export function parseBody(data: unknown): Record<string, unknown> {
    if (data instanceof FormData) {
        return formDataToObject(data);
    }

    if (typeof data === 'string') {
        try {
            const parsed: unknown = JSON.parse(data);

            return isRecord(parsed) ? parsed : {};
        } catch {
            return {};
        }
    }

    return isRecord(data) ? data : {};
}

export function normalizeHeaders(
    headers: Record<string, unknown> | Headers | undefined,
): Record<string, string> {
    const entries: [string, unknown][] =
        headers instanceof Headers
            ? [...headers.entries()]
            : Object.entries(headers ?? {});

    return Object.fromEntries(
        entries.map(([name, value]) => [name.toLowerCase(), String(value)]),
    );
}

const METHODS: Record<string, HttpMethod> = {
    GET: 'GET',
    QUERY: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
};

/** Inertia's "query" method is a GET whose data goes into the URL. */
export function toHttpMethod(method: string): HttpMethod | null {
    return METHODS[method.toUpperCase()] ?? null;
}
