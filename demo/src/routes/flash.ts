import { translateText, type Replacements } from '@/lib/i18n';
import type { Toast, ToastAction } from '@/types';
import type { DemoState } from '../state/types';
import { WriteRejected } from '../domain/reading-writes';
import { forgetUndo } from '../domain/undo';
import {
    errorToast,
    redirectBack,
    successToast,
    type RedirectResult,
    type RouteResult,
} from '../server/router';

type NoticeOptions = {
    action?: ToastAction | null;
    undo?: string | null;
};

/** Toast::success: a notice without undo ends the undo of the action before it. */
export function successNotice(
    title: string,
    sub: string | null = null,
    options: NoticeOptions = {},
): Toast {
    const undo = options.undo ?? null;

    if (undo === null) {
        forgetUndo();
    }

    return {
        ...successToast(title, sub),
        action: options.action ?? null,
        undo,
    };
}

export function translateFor(
    state: DemoState,
    text: string,
    replacements?: Replacements,
): string {
    return translateText(state.runtime.locale, text, replacements);
}

/**
 * Runs an action whose validation can refuse it. The app shows the refusal beside the
 * form; the demo has no form errors, so it is shown as an error notice instead.
 */
export function refusable(action: () => RouteResult): RouteResult {
    try {
        return action();
    } catch (error) {
        if (error instanceof WriteRejected) {
            return redirectBack({ toast: errorToast(error.message) });
        }

        throw error;
    }
}

export function backWith(toast: Toast): RedirectResult {
    return redirectBack({ toast });
}
