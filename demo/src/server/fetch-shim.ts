import { currentAppUrl, isUnderBase, stripBase, toAppUrl } from './base-path';
import { dispatchAsync, type DemoRequest } from './dispatch';
import { findRoute } from './router';
import {
    formDataToObject,
    normalizeHeaders,
    parseBody,
    toHttpMethod,
} from './request-parts';

async function readBody(request: Request): Promise<Record<string, unknown>> {
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
        return formDataToObject(await request.formData());
    }

    return parseBody(await request.text());
}

/**
 * Answers a same-origin request from the fake server, or returns null to let the
 * network handle it (Vite's assets and modules, which live under the base).
 */
async function answerLocally(
    request: Request,
    url: URL,
): Promise<Response | null> {
    const method = toHttpMethod(request.method);

    if (method === null) {
        return null;
    }

    const isAppRoute = findRoute(method, stripBase(url.pathname)) !== null;

    if (!isAppRoute && isUnderBase(url.pathname)) {
        return null;
    }

    const demoRequest: DemoRequest = {
        method,
        url: toAppUrl(url),
        body: method === 'GET' ? {} : await readBody(request),
        headers: normalizeHeaders(request.headers),
        currentPath: currentAppUrl(),
    };
    const response = await dispatchAsync(demoRequest);

    return new Response(response.body, {
        status: response.status,
        headers: response.headers,
    });
}

/** Wraps window.fetch so the app's JSON routes resolve in the fake server, not the network. */
export function installFetchShim(): void {
    const nativeFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        const url = new URL(request.url);

        if (url.origin !== window.location.origin) {
            return nativeFetch(request);
        }

        return (await answerLocally(request, url)) ?? nativeFetch(request);
    };
}
