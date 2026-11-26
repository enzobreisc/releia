import '../routes';
import './shell-routes';
import { translateText } from '@/lib/i18n';
import { sharedProps } from '../presenters/shared';
import { ONLY_IN_APP_PAGE, WELCOME_PAGE } from '../shell/constants';
import { hasEnteredDemo } from '../shell/entry';
import { localIsoDate } from '../state/dates';
import { getState, saveState } from '../state/store';
import type { DemoState } from '../state/types';
import { toBrowserUrl } from './base-path';
import {
    errorToast,
    findRoute,
    type HttpMethod,
    type RedirectResult,
    type RouteContext,
    type RouteMatch,
    type RouteResult,
} from './router';

/** Inertia compares this with the version the client was started with, so a mismatch reloads it. */
const DEMO_INERTIA_VERSION = 'releia-demo';

const MAX_REDIRECTS = 3;
const OVERRIDABLE_METHODS: readonly string[] = ['PUT', 'PATCH', 'DELETE'];
const UNAVAILABLE_TITLE = 'Disponível só no app';
const UNAVAILABLE_SUB = 'Na demo, esta ação só funciona no app.';
const NOT_FOUND_MESSAGE = 'Página não encontrada';
const LANDING_PATH = '/';

/** A request in the app's own terms: URLs without the base, headers in lower case. */
export type DemoRequest = {
    method: HttpMethod;
    /** App path and query, e.g. "/library?sort=title". */
    url: string;
    body: Record<string, unknown>;
    headers: Record<string, string>;
    /** App path and query of the page the request came from. */
    currentPath: string;
};

export type DemoResponse = {
    status: number;
    headers: Record<string, string>;
    body: string;
};

function parseAppUrl(appUrl: string): { path: string; query: URLSearchParams } {
    const url = new URL(appUrl, 'http://demo.invalid');

    return { path: url.pathname, query: url.searchParams };
}

function isInertiaRequest(request: DemoRequest): boolean {
    return request.headers['x-inertia'] === 'true';
}

function resolveMethod(request: DemoRequest): HttpMethod {
    const override = request.body._method;

    if (request.method !== 'POST' || typeof override !== 'string') {
        return request.method;
    }

    const upper = override.toUpperCase();

    return OVERRIDABLE_METHODS.includes(upper)
        ? (upper as HttpMethod)
        : request.method;
}

function withoutMethodOverride(
    body: Record<string, unknown>,
): Record<string, unknown> {
    const rest = { ...body };
    delete rest._method;

    return rest;
}

function translate(state: DemoState, text: string): string {
    return translateText(state.runtime.locale, text);
}

function jsonResponse(data: unknown, status: number): DemoResponse {
    return {
        status,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
    };
}

function contextFor(
    appUrl: string,
    body: Record<string, unknown>,
    params: Record<string, string>,
    currentPath: string,
): RouteContext {
    const state = getState();
    const { query } = parseAppUrl(appUrl);

    return {
        state,
        params,
        query,
        body,
        today: localIsoDate(new Date()),
        locale: state.runtime.locale,
        currentPath,
    };
}

/** Partial reloads send the props they want; the page keeps the rest. */
function selectProps(
    props: Record<string, unknown>,
    component: string,
    request: DemoRequest,
): Record<string, unknown> {
    if (request.headers['x-inertia-partial-component'] !== component) {
        return props;
    }

    const only = listHeader(request.headers['x-inertia-partial-data']);
    const except = listHeader(request.headers['x-inertia-partial-except']);

    return Object.fromEntries(
        Object.entries(props).filter(
            ([key]) =>
                (only.length === 0 || only.includes(key)) &&
                !except.includes(key),
        ),
    );
}

function listHeader(value: string | undefined): string[] {
    return value === undefined || value === '' ? [] : value.split(',');
}

function renderPage(
    component: string,
    props: Record<string, unknown>,
    appUrl: string,
    request: DemoRequest,
): DemoResponse {
    const state = getState();
    const shared = sharedProps(state, localIsoDate(new Date()));
    const allProps = { ...shared, ...props, errors: [] };
    const page = {
        component,
        props: selectProps(allProps, component, request),
        url: toBrowserUrl(appUrl),
        version: DEMO_INERTIA_VERSION,
    };

    // A flash toast is shown on the first page rendered after the action that set it.
    state.runtime.flashToast = null;

    if (!isInertiaRequest(request)) {
        return jsonResponse(page, 200);
    }

    return {
        status: 200,
        headers: {
            'content-type': 'application/json',
            'x-inertia': 'true',
            'x-inertia-version': DEMO_INERTIA_VERSION,
            vary: 'X-Inertia',
        },
        body: JSON.stringify(page),
    };
}

/** A GET to the page a redirect points at, rendered in place: the client never sees a 3xx. */
function pageHop(appUrl: string, request: DemoRequest, redirects: number): Hop {
    const { path } = parseAppUrl(appUrl);
    const match = findRoute('GET', path);

    if (match === null) {
        return doneHop(renderPage(ONLY_IN_APP_PAGE, {}, appUrl, request));
    }

    return {
        kind: 'next',
        appUrl,
        path,
        match,
        context: contextFor(appUrl, {}, match.params, appUrl),
        request,
        redirects,
    };
}

function doneHop(response: DemoResponse): Hop {
    return { kind: 'done', response };
}

function redirectHop(
    result: RedirectResult,
    request: DemoRequest,
    redirects: number,
): Hop {
    if (result.toast !== null) {
        getState().runtime.flashToast = result.toast;
    }

    if (redirects >= MAX_REDIRECTS) {
        return doneHop(jsonResponse({ message: 'Too many redirects' }, 500));
    }

    return pageHop(result.path ?? request.currentPath, request, redirects + 1);
}

/** A redirect target is rendered in place, so the handler of a sync dispatch must answer without the network. */
function syncResult(
    result: RouteResult | Promise<RouteResult>,
    path: string,
): RouteResult {
    if (result instanceof Promise) {
        throw new Error(
            `${path} is answered asynchronously; use dispatchAsync.`,
        );
    }

    return result;
}

function respond(
    result: Exclude<RouteResult, RedirectResult>,
    appUrl: string,
    request: DemoRequest,
): DemoResponse {
    switch (result.kind) {
        case 'json':
            return jsonResponse(result.data, result.status);
        case 'render':
            return renderPage(result.component, result.props, appUrl, request);
    }
}

/**
 * A request with no registered route. An unknown page keeps its address and shows the
 * "only in the app" page; a mutation that the demo cannot run shows a notice where it was.
 * Other clients get a JSON error.
 */
function unmatched(request: DemoRequest, method: HttpMethod): Hop {
    const state = getState();

    if (!isInertiaRequest(request)) {
        const message =
            method === 'GET' ? NOT_FOUND_MESSAGE : UNAVAILABLE_TITLE;

        return doneHop(
            jsonResponse({ message: translate(state, message) }, 404),
        );
    }

    if (method === 'GET') {
        return doneHop(renderPage(ONLY_IN_APP_PAGE, {}, request.url, request));
    }

    state.runtime.flashToast = errorToast(
        translate(state, UNAVAILABLE_TITLE),
        translate(state, UNAVAILABLE_SUB),
    );

    return pageHop(request.currentPath, request, 1);
}

type RoutedRequest = {
    kind: 'routed';
    request: DemoRequest;
    method: HttpMethod;
    body: Record<string, unknown>;
    match: RouteMatch;
    context: RouteContext;
};

type AnsweredRequest = { kind: 'answered'; hop: Hop };

type PreparedRequest = AnsweredRequest | RoutedRequest;

/** Where a request lands next: a finished response, or a page whose handler still has to run. */
type Hop =
    | { kind: 'done'; response: DemoResponse }
    | {
          kind: 'next';
          appUrl: string;
          path: string;
          match: RouteMatch;
          context: RouteContext;
          request: DemoRequest;
          redirects: number;
      };

function prepare(request: DemoRequest): PreparedRequest {
    const method = resolveMethod(request);
    const { path } = parseAppUrl(request.url);

    if (method === 'GET' && path === LANDING_PATH && !hasEnteredDemo()) {
        return {
            kind: 'answered',
            hop: doneHop(renderPage(WELCOME_PAGE, {}, request.url, request)),
        };
    }

    const match = findRoute(method, path);

    if (match === null) {
        return { kind: 'answered', hop: unmatched(request, method) };
    }

    const body = withoutMethodOverride(request.body);
    const context = contextFor(
        request.url,
        body,
        match.params,
        request.currentPath,
    );

    return { kind: 'routed', request, method, body, match, context };
}

/** Mutations are saved once their handler has run; the result then lands on a page or a redirect. */
function commit(routed: RoutedRequest): void {
    if (routed.method !== 'GET') {
        saveState(routed.context.state);
    }
}

function settle(
    result: RouteResult,
    appUrl: string,
    request: DemoRequest,
    redirects: number,
): Hop {
    if (result.kind === 'redirect') {
        return redirectHop(result, request, redirects);
    }

    return doneHop(respond(result, appUrl, request));
}

function requestOf(routed: RoutedRequest): DemoRequest {
    return { ...routed.request, method: routed.method, body: routed.body };
}

function answerSync(hop: Hop): DemoResponse {
    if (hop.kind === 'done') {
        return hop.response;
    }

    const result = syncResult(hop.match.handler(hop.context), hop.path);

    return answerSync(settle(result, hop.appUrl, hop.request, hop.redirects));
}

async function answerAsync(hop: Hop): Promise<DemoResponse> {
    if (hop.kind === 'done') {
        return hop.response;
    }

    const result = await hop.match.handler(hop.context);

    return answerAsync(settle(result, hop.appUrl, hop.request, hop.redirects));
}

export function dispatch(request: DemoRequest): DemoResponse {
    const prepared = prepare(request);

    if (prepared.kind === 'answered') {
        return answerSync(prepared.hop);
    }

    const result = syncResult(
        prepared.match.handler(prepared.context),
        request.url,
    );

    commit(prepared);

    return answerSync(settle(result, request.url, requestOf(prepared), 0));
}

export async function dispatchAsync(
    request: DemoRequest,
): Promise<DemoResponse> {
    const prepared = prepare(request);

    if (prepared.kind === 'answered') {
        return answerAsync(prepared.hop);
    }

    const result = await prepared.match.handler(prepared.context);

    commit(prepared);

    return answerAsync(settle(result, request.url, requestOf(prepared), 0));
}
