import { useEffect, useState } from 'react';

type CountingTimer = { elapsed: number; paused: boolean };

/** Timer seconds, counted in the browser from what the server sent. */
export function useElapsed(timer: CountingTimer | null) {
    const [now, setNow] = useState(() => Date.now());
    // Moment this timer state arrived: pausing or resuming sends a new one.
    const [received, setReceived] = useState({ timer, at: Date.now() });

    if (received.timer !== timer) {
        setReceived({ timer, at: Date.now() });
    }

    const loadedAt = received.at;

    useEffect(() => {
        if (!timer || timer.paused) {
            return;
        }

        const id = window.setInterval(() => setNow(Date.now()), 1000);

        return () => window.clearInterval(id);
    }, [timer]);

    if (!timer) {
        return 0;
    }

    return timer.paused
        ? timer.elapsed
        : timer.elapsed + Math.max(0, Math.floor((now - loadedAt) / 1000));
}
