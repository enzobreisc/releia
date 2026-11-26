import type { Locale } from '@/lib/i18n';
import type { Toast } from '@/types';
import type { DemoState } from '../state/types';
import type { FieldErrors } from '../support/form-errors';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RouteContext = {
    state: DemoState;
    params: Record<string, string>;
    query: URLSearchParams;
    body: Record<string, unknown>;
    today: string;
    locale: Locale;
    /** App path and query of the page the request came from, e.g. "/library?sort=title". */
    currentPath: string;
};

type RenderResult = {
    kind: 'render';
    component: string;
    props: Record<string, unknown>;
};

type RedirectOptions = { toast?: Toast; errors?: FieldErrors };

/** `path` null means back to the page the request came from. */
export type RedirectResult = {
    kind: 'redirect';
    path: string | null;
    toast: Toast | null;
    errors: FieldErrors | null;
};

type JsonResult = {
    kind: 'json';
    data: unknown;
    status: number;
};

export type RouteResult = RenderResult | RedirectResult | JsonResult;

/** A handler that talks to the network returns a Promise; the fetch shim awaits it. */
type RouteHandler = (
    context: RouteContext,
) => RouteResult | Promise<RouteResult>;

type Segment =
    | { type: 'literal'; value: string }
    | { type: 'param'; name: string; optional: boolean };

type RegisteredRoute = {
    method: HttpMethod;
    pattern: string;
    segments: Segment[];
    literalCount: number;
    handler: RouteHandler;
};

export type RouteMatch = {
    handler: RouteHandler;
    params: Record<string, string>;
};

const PARAM_PATTERN = /^\{(\w+)(\?)?\}$/;

const registry: RegisteredRoute[] = [];

function splitPath(path: string): string[] {
    return path.split('/').filter((part) => part !== '');
}

function parsePattern(pattern: string): Segment[] {
    return splitPath(pattern).map((part): Segment => {
        const param = PARAM_PATTERN.exec(part);

        if (param === null) {
            return { type: 'literal', value: part };
        }

        return { type: 'param', name: param[1], optional: param[2] === '?' };
    });
}

/** A malformed escape such as "100%" matches no route, rather than throwing. */
function decodeParam(part: string): string | null {
    try {
        return decodeURIComponent(part);
    } catch (error) {
        if (error instanceof URIError) {
            return null;
        }

        throw error;
    }
}

function matchSegments(
    segments: Segment[],
    parts: string[],
): Record<string, string> | null {
    if (parts.length > segments.length) {
        return null;
    }

    const params: Record<string, string> = {};

    for (const [index, segment] of segments.entries()) {
        const part = parts[index];

        if (segment.type === 'literal') {
            if (part !== segment.value) {
                return null;
            }

            continue;
        }

        if (part === undefined) {
            if (segment.optional) {
                continue;
            }

            return null;
        }

        const value = decodeParam(part);

        if (value === null) {
            return null;
        }

        params[segment.name] = value;
    }

    return params;
}

/**
 * Registers a handler for a Wayfinder URL pattern such as "/books/{book}" or
 * "/library/{book?}". Route modules call this when they are loaded.
 */
export function route(
    method: HttpMethod,
    pattern: string,
    handler: RouteHandler,
): void {
    const normalized = `/${splitPath(pattern).join('/')}`;

    if (
        registry.some(
            (entry) => entry.method === method && entry.pattern === normalized,
        )
    ) {
        throw new Error(`Route already registered: ${method} ${normalized}`);
    }

    const segments = parsePattern(normalized);

    registry.push({
        method,
        pattern: normalized,
        segments,
        literalCount: segments.filter((segment) => segment.type === 'literal')
            .length,
        handler,
    });
}

/** The most specific match wins: a literal segment beats a parameter, so "/books/create" beats "/books/{book}". */
export function findRoute(method: HttpMethod, path: string): RouteMatch | null {
    const parts = splitPath(path);
    let best: { match: RouteMatch; literalCount: number } | null = null;

    for (const entry of registry) {
        if (entry.method !== method) {
            continue;
        }

        const params = matchSegments(entry.segments, parts);

        if (params === null) {
            continue;
        }

        if (best === null || entry.literalCount > best.literalCount) {
            best = {
                match: { handler: entry.handler, params },
                literalCount: entry.literalCount,
            };
        }
    }

    return best?.match ?? null;
}

export function render(
    component: string,
    props: Record<string, unknown> = {},
): RenderResult {
    return { kind: 'render', component, props };
}

function redirectTo(
    path: string | null,
    options: RedirectOptions,
): RedirectResult {
    return {
        kind: 'redirect',
        path,
        toast: options.toast ?? null,
        errors: options.errors ?? null,
    };
}

export function redirect(
    path: string,
    options: RedirectOptions = {},
): RedirectResult {
    return redirectTo(path, options);
}

/** Back to the page the request came from, with its notice or its field errors. */
export function redirectBack(options: RedirectOptions = {}): RedirectResult {
    return redirectTo(null, options);
}

export function json(data: unknown, status = 200): JsonResult {
    return { kind: 'json', data, status };
}

function createToast(
    kind: Toast['kind'],
    title: string,
    sub: string | null,
): Toast {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        kind,
        title,
        sub,
        action: null,
        undo: null,
    };
}

/** Title and sub must already be translated, e.g. with translateText(context.locale, ...). */
export function successToast(title: string, sub: string | null = null): Toast {
    return createToast('success', title, sub);
}

export function errorToast(title: string, sub: string | null = null): Toast {
    return createToast('error', title, sub);
}
