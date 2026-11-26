import { translateText, type Replacements } from '@/lib/i18n';
import type { Toast, ToastAction } from '@/types';
import type { DemoState } from '../state/types';
import { forgetUndo } from '../domain/undo';
import { WriteRejected } from '../support/form-errors';
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

/** A refusal of a button's action: the app shows its message as a notice. */
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

/** A refusal of a form: the app sends its messages back to show beside the fields. */
export function formRefusable(action: () => RouteResult): RouteResult {
    try {
        return action();
    } catch (error) {
        if (error instanceof WriteRejected) {
            return redirectBack({ errors: error.errors });
        }

        throw error;
    }
}

export function backWith(toast: Toast): RedirectResult {
    return redirectBack({ toast });
}
