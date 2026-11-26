import type { Locale } from '@/lib/i18n';
import {
    LOCALE_NAMES,
    LOCALE_PATH,
    LOCALES,
    ONLY_IN_APP_PAGE,
    ONLY_IN_APP_PATH,
    WELCOME_PAGE,
    WELCOME_PATH,
} from '../shell/constants';
import { shellCopyFor } from '../shell/copy';
import { redirectBack, render, route, successToast } from './router';

function localeFrom(value: unknown): Locale | null {
    return LOCALES.find((code) => code === value) ?? null;
}

route('GET', WELCOME_PATH, () => render(WELCOME_PAGE));
route('GET', ONLY_IN_APP_PATH, () => render(ONLY_IN_APP_PAGE));

route('PUT', LOCALE_PATH, ({ state, body }) => {
    const locale = localeFrom(body.locale);

    if (locale === null || state.runtime.locale === locale) {
        return redirectBack();
    }

    state.runtime.locale = locale;

    return redirectBack({
        toast: successToast(
            shellCopyFor(locale).topBar.languageChanged,
            LOCALE_NAMES[locale],
        ),
    });
});
