/** "/releia", from Vite's base "/releia/". Wayfinder URLs never carry it. */
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '');

export function isUnderBase(pathname: string): boolean {
    return pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`);
}

/** "/releia/library" becomes "/library"; a path outside the base is returned unchanged. */
export function stripBase(pathname: string): string {
    if (!isUnderBase(pathname)) {
        return pathname;
    }

    const stripped = pathname.slice(BASE_PATH.length);

    return stripped === '' ? '/' : stripped;
}

/** "/library?sort=title" becomes "/releia/library?sort=title" for the address bar. */
export function toBrowserUrl(appUrl: string): string {
    return `${BASE_PATH}${appUrl}`;
}

/** The app path and query of a URL, without the base: "/library?sort=title". */
export function toAppUrl(url: URL): string {
    return `${stripBase(url.pathname)}${url.search}`;
}

export function currentAppUrl(): string {
    return toAppUrl(new URL(window.location.href));
}
