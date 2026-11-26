import { ENTERED_STORAGE_KEY } from './constants';

/**
 * Storage that cannot be read (blocked or private) counts as entered, so the landing
 * page never traps a visitor who cannot save the flag.
 */
export function hasEnteredDemo(): boolean {
    try {
        return window.localStorage.getItem(ENTERED_STORAGE_KEY) === 'true';
    } catch {
        return true;
    }
}

export function markDemoEntered(): void {
    try {
        window.localStorage.setItem(ENTERED_STORAGE_KEY, 'true');
    } catch {
        // Without storage the landing page shows again on the next visit.
    }
}
