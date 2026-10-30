import { useEffect, useRef, useState } from 'react';

/** Open state of a popover that closes on a click outside it or on Escape. */
export function usePopover<T extends HTMLElement = HTMLDivElement>() {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<T>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function onMouseDown(event: MouseEvent) {
            if (!ref.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen]);

    return {
        ref,
        isOpen,
        toggle: () => setIsOpen(!isOpen),
        close: () => setIsOpen(false),
    };
}
