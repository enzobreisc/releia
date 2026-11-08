import { router } from '@inertiajs/react';
import { useEffect } from 'react';

const ESCAPE_KEY = 'Escape';

/** Visits the given URL when the reader presses Escape. */
export function useLeaveOnEscape(url: string) {
    useEffect(() => {
        function leaveOnEscape(event: KeyboardEvent) {
            if (event.key === ESCAPE_KEY) {
                router.visit(url);
            }
        }

        window.addEventListener('keydown', leaveOnEscape);

        return () => window.removeEventListener('keydown', leaveOnEscape);
    }, [url]);
}
