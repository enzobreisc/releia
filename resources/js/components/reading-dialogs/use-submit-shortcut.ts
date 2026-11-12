import { useEffect } from 'react';

export function useSubmitShortcut(submit: () => void, enabled: boolean) {
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (enabled && event.metaKey && event.key === 'Enter') {
                event.preventDefault();
                submit();
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [submit, enabled]);
}
