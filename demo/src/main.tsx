import type { Page } from '@inertiajs/core';
import {
    createInertiaApp,
    router,
    type ResolvedComponent,
} from '@inertiajs/react';
import { translateText, type Locale } from '@/lib/i18n';
import { interceptPlainLinks } from './navigation';
import { currentAppUrl } from './server/base-path';
import { dispatchAsync } from './server/dispatch';
import { installFetchShim } from './server/fetch-shim';
import { demoHttpClient } from './server/http-client';
import {
    QuickLogDemoFrame,
    SidebarDemoFrame,
    SidebarlessDemoFrame,
} from './shell/frame';
import { QUICK_LOG_PAGE, WELCOME_PAGE } from './shell/constants';
import { DEMO_PAGES } from './shell/pages';
import { followStoredStateChanges, getState } from './state/store';
import { withWideShellProps } from './shell/wide-shell';
import './styles.css';

// Same rules as resources/js/app.tsx: keep both in step when either changes.
const SIDEBARLESS_PAGES = ['quick-log', 'live-session'];
const APP_NAME = 'releia';
const UNTITLED_PAGE_LABEL = 'Demonstração';

const CHUNK_RELOAD_KEY = 'releia-demo:chunk-reloaded-at';
const CHUNK_RELOAD_WINDOW_MS = 10_000;
const BOOT_FAILURE_MESSAGE =
    'Não foi possível abrir a demo. Recarregue a página.';
const DEFAULT_LOCALE: Locale = 'pt_BR';

const pageModules = import.meta.glob<{ default: ResolvedComponent }>(
    '../../resources/js/pages/**/*.tsx',
);

/** Visits to the same URL, such as a locale change, fire no navigate event, so the language follows every success. */
function applyDocumentLanguage(page: Page): void {
    document.documentElement.lang = String(page.props.language_tag);
}

router.on('success', (event) => {
    applyDocumentLanguage(event.detail.page);
});

async function resolvePage(name: string): Promise<ResolvedComponent> {
    if (Object.hasOwn(DEMO_PAGES, name)) {
        return DEMO_PAGES[name];
    }

    const loadPage = pageModules[`../../resources/js/pages/${name}.tsx`];

    if (loadPage === undefined) {
        throw new Error(`Page not found: ${name}`);
    }

    return (await loadPage()).default;
}

/** The page for the current URL, answered by the fake server since there is no Blade template. */
async function readInitialPage(): Promise<Page> {
    const appUrl = currentAppUrl();
    const response = await dispatchAsync({
        method: 'GET',
        url: appUrl,
        body: {},
        headers: { 'x-inertia': 'true' },
        currentPath: appUrl,
    });

    return withWideShellProps(JSON.parse(response.body) as Page);
}

/** Allows one reload per window, so a chunk that stays missing cannot reload the tab forever. */
function mayReloadForStaleChunk(): boolean {
    try {
        const lastReload = Number(
            window.sessionStorage.getItem(CHUNK_RELOAD_KEY),
        );

        if (Date.now() - lastReload < CHUNK_RELOAD_WINDOW_MS) {
            return false;
        }

        window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));

        return true;
    } catch {
        return false;
    }
}

/** A tab left open across a deploy requests page chunks that no longer exist; a reload fetches the new build. */
window.addEventListener('vite:preloadError', (event) => {
    if (mayReloadForStaleChunk()) {
        event.preventDefault();
        window.location.reload();
    }
});

function currentLocale(): Locale {
    try {
        return getState().runtime.locale;
    } catch {
        return DEFAULT_LOCALE;
    }
}

/** Pages without a title of their own, such as the landing, still name the demo in the tab. */
function untitledDocumentTitle(): string {
    return `${APP_NAME} · ${translateText(currentLocale(), UNTITLED_PAGE_LABEL)}`;
}

function showBootFailure(error: unknown): void {
    console.error(error);

    const root = document.getElementById('app');

    if (root !== null) {
        root.textContent = translateText(currentLocale(), BOOT_FAILURE_MESSAGE);
    }
}

async function boot(): Promise<void> {
    installFetchShim();
    followStoredStateChanges();
    interceptPlainLinks();
    const initialPage = await readInitialPage();
    applyDocumentLanguage(initialPage);

    await createInertiaApp({
        page: initialPage,
        resolve: resolvePage,
        http: demoHttpClient,
        title: (title) =>
            title ? `${title} - ${APP_NAME}` : untitledDocumentTitle(),
        layout: (name) => {
            if (name === WELCOME_PAGE) {
                return null;
            }

            if (name === QUICK_LOG_PAGE) {
                return QuickLogDemoFrame;
            }

            return SIDEBARLESS_PAGES.includes(name)
                ? SidebarlessDemoFrame
                : SidebarDemoFrame;
        },
        progress: {
            color: '#2F6FE4',
        },
    });
}

boot().catch(showBootFailure);
