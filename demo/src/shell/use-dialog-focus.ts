import { type RefObject, useEffect } from 'react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * The menu unmounts before the restore dialog mounts, so by then its trigger has lost
 * focus. The last element focused before any demo dialog opened is kept for the return.
 */
let focusReturnTarget: HTMLElement | null = null;

function focusableWithin(container: HTMLElement): HTMLElement[] {
    return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
}

function rememberFocusedElement(): void {
    const active = document.activeElement;

    if (active instanceof HTMLElement && active !== document.body) {
        focusReturnTarget = active;
    }
}

function wrapTab(event: KeyboardEvent, container: HTMLElement): void {
    const items = focusableWithin(container);
    const first = items[0];
    const last = items.at(-1);

    if (first === undefined || last === undefined) {
        return;
    }

    const active = document.activeElement;
    const isOutside = active === null || !container.contains(active);

    if (event.shiftKey && (active === first || isOutside)) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && (active === last || isOutside)) {
        event.preventDefault();
        first.focus();
    }
}

/** Moves focus into a modal, keeps Tab inside it, and returns focus to the control that opened it. */
export function useDialogFocus(
    containerRef: RefObject<HTMLElement | null>,
): void {
    useEffect(() => {
        const container = containerRef.current;

        if (container === null) {
            return;
        }

        rememberFocusedElement();
        focusableWithin(container)[0]?.focus();

        const handleTab = (event: KeyboardEvent) => {
            if (event.key === 'Tab') {
                wrapTab(event, container);
            }
        };

        document.addEventListener('keydown', handleTab);

        return () => {
            document.removeEventListener('keydown', handleTab);

            if (focusReturnTarget?.isConnected) {
                focusReturnTarget.focus();
            }
        };
    }, [containerRef]);
}
