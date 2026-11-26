import type {
    HttpClient,
    HttpRequestConfig,
    HttpResponse,
    Page,
} from '@inertiajs/core';
import { http } from '@inertiajs/react';
import { currentAppUrl, toAppUrl } from './base-path';
import { dispatchAsync, type DemoRequest, type DemoResponse } from './dispatch';
import { normalizeHeaders, parseBody, toHttpMethod } from './request-parts';
import { withWideShellProps } from '../shell/wide-shell';

function toDemoRequest(config: HttpRequestConfig): DemoRequest {
    const method = toHttpMethod(config.method);

    if (method === null) {
        throw new Error(`Unsupported method in the demo: ${config.method}`);
    }

    const url = new URL(config.url, window.location.href);

    for (const [name, value] of Object.entries(config.params ?? {})) {
        url.searchParams.set(name, String(value));
    }

    return {
        method,
        url: toAppUrl(url),
        body: parseBody(config.data),
        headers: normalizeHeaders(config.headers),
        currentPath: currentAppUrl(),
    };
}

function pageBody(response: DemoResponse): string {
    if (response.headers['x-inertia'] !== 'true') {
        return response.body;
    }

    return JSON.stringify(
        withWideShellProps(JSON.parse(response.body) as Page),
    );
}

/**
 * Replaces Inertia's XHR client: every visit is answered by the fake server in the
 * same tab, with the same interceptors and response shape.
 */
export const demoHttpClient: HttpClient = {
    async request(config: HttpRequestConfig): Promise<HttpResponse> {
        const processed = await http.processRequest(config);
        const response = await dispatchAsync(toDemoRequest(processed));

        return http.processResponse({
            status: response.status,
            headers: response.headers,
            data: pageBody(response),
        });
    },
};
