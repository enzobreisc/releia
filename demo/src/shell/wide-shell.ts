import type { Page } from '@inertiajs/core';
import { QUICK_LOG_PAGE } from './constants';

/** The md: breakpoint, where the demo shows the quick-log page in its menu bar window. */
export const WIDE_SHELL_QUERY = '(min-width: 768px)';

export function isWideShell(): boolean {
    return window.matchMedia(WIDE_SHELL_QUERY).matches;
}

/**
 * The quick-log page renders its native variant (no mobile sizing, shortcut hint instead of the
 * widget link) inside the desktop window. Only the browser gets this: the server keeps
 * native false, so the golden pages and their tests are unchanged.
 */
export function withWideShellProps(page: Page): Page {
    if (page.component !== QUICK_LOG_PAGE || !isWideShell()) {
        return page;
    }

    return { ...page, props: { ...page.props, native: true } };
}
