import { useState } from 'react';

/** Preference kept in the browser; without storage, the default applies. */
export function useStored<T extends string>(key: string, fallback: T) {
    const [value, setValue] = useState<T>(() => {
        try {
            return (localStorage.getItem(key) as T | null) ?? fallback;
        } catch {
            return fallback;
        }
    });

    function update(next: T) {
        setValue(next);

        try {
            localStorage.setItem(key, next);
        } catch {
            // without storage: the choice only lasts for this session
        }
    }

    return [value, update] as const;
}
