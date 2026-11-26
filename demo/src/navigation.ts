import { router } from '@inertiajs/react';
import { toAppUrl } from './server/base-path';

/**
 * Plain <a href> links skip Inertia's own click handling, so they would load the
 * page from the server. This sends same-origin clicks through the fake client instead.
 */
export function interceptPlainLinks(): void {
    document.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0) {
            return;
        }

        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        const anchor =
            event.target instanceof Element
                ? event.target.closest('a[href]')
                : null;

        if (
            !(anchor instanceof HTMLAnchorElement) ||
            anchor.hasAttribute('download') ||
            (anchor.target !== '' && anchor.target !== '_self') ||
            anchor.getAttribute('href')?.startsWith('#') === true
        ) {
            return;
        }

        const url = new URL(anchor.href);

        if (url.origin !== window.location.origin) {
            return;
        }

        event.preventDefault();
        router.visit(toAppUrl(url));
    });
}
