import { useEffect, useRef, useState } from 'react';

const INITIAL_WIDTH = 900;

export function useElementWidth() {
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(INITIAL_WIDTH);

    useEffect(() => {
        const element = ref.current;

        if (!element) {
            return;
        }

        const observer = new ResizeObserver(([entry]) =>
            setWidth(entry.contentRect.width),
        );
        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    return [ref, width] as const;
}
