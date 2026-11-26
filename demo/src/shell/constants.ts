import type { Locale } from '@/lib/i18n';

export const WELCOME_PATH = '/welcome';
export const ONLY_IN_APP_PATH = '/only-in-app';
export const QUICK_LOG_PATH = '/quick-log';
export const LOCALE_PATH = '/locale';

/** Demo-only Inertia components, resolved by name in main.tsx instead of resources/js/pages. */
export const WELCOME_PAGE = 'Demo/Welcome';
export const ONLY_IN_APP_PAGE = 'Demo/OnlyInApp';

export const ENTERED_STORAGE_KEY = 'releia-demo:entered';

export const GITHUB_URL = 'https://github.com/enzobreisc/releia';
export const DOWNLOAD_URL =
    'https://github.com/enzobreisc/releia/releases/latest';

export const LOCALES: readonly Locale[] = ['pt_BR', 'en'];

export const LOCALE_TAGS: Record<Locale, string> = {
    pt_BR: 'pt-BR',
    en: 'en-US',
};

export const LOCALE_NAMES: Record<Locale, string> = {
    pt_BR: 'Português (Brasil)',
    en: 'English',
};

/** Inertia component of the quick-log page, which the demo shows as a menu bar window on desktop. */
export const QUICK_LOG_PAGE = 'quick-log';
