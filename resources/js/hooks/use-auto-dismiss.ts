import { useEffect, useRef } from 'react';

/** Calls `onDismiss` once after `delayMs`; hover and focus never pause it. */
export function useAutoDismiss(
    onDismiss: () => void,
    delayMs: number,
    enabled: boolean,
) {
    const onDismissRef = useRef(onDismiss);

    useEffect(() => {
        onDismissRef.current = onDismiss;
    });

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const timer = window.setTimeout(() => onDismissRef.current(), delayMs);

        return () => window.clearTimeout(timer);
    }, [delayMs, enabled]);
}
