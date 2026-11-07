import { useEffect, useState } from 'react';

const TICK_MS = 1000;

/** The current moment, refreshed every second. */
export function useNow() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), TICK_MS);

        return () => window.clearInterval(id);
    }, []);

    return now;
}
