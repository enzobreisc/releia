export const JSON_HEADERS = { Accept: 'application/json' };

const XSRF_COOKIE = 'XSRF-TOKEN';

/** Laravel expects the XSRF cookie echoed back in a header on JSON requests made with fetch. */
export function jsonPostHeaders(): HeadersInit {
    return {
        ...JSON_HEADERS,
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': xsrfToken(),
    };
}

function xsrfToken(): string {
    const cookie = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith(`${XSRF_COOKIE}=`));

    return cookie === undefined
        ? ''
        : decodeURIComponent(cookie.slice(XSRF_COOKIE.length + 1));
}
