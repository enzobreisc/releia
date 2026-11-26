import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test';
import type { Toast } from '@/types';
import { getState } from '../src/state/store';
import {
    type ServedResponse,
    resetDemoState,
    restoreClock,
    sendRequest,
} from './harness';

const PINS_KEY = 'pinned_books';
const READER_KEY = 'reader';
const PROFILE_PATH = '/profile';

afterAll(() => {
    restoreClock();
});

beforeEach(() => {
    resetDemoState({ locale: 'en' });
});

function settingOf(key: string): string | null {
    return (
        getState().tables.settings.find((row) => row.key === key)?.value ?? null
    );
}

function toastOf(response: ServedResponse): Toast | null {
    return (response.page?.props.toast ?? null) as Toast | null;
}

/** A mutation sent from the profile page, as the browser sends it. */
function act(
    request: Omit<Parameters<typeof sendRequest>[0], 'currentPath'>,
): ServedResponse {
    return sendRequest({ ...request, currentPath: PROFILE_PATH });
}

function profileProps(): Record<string, unknown> {
    return sendRequest({ url: '/profile' }).page?.props ?? {};
}

function pinnedTitles(): string[] {
    const pinned = profileProps().pinned as { title: string }[];

    return pinned.map((book) => book.title);
}

describe('profile update', () => {
    it('stores the trimmed name and bio, and blank text as null', () => {
        const response = act({
            method: 'PUT',
            url: '/profile',
            body: { name: '  Ana  ', bio: '   ' },
        });

        expect(settingOf(READER_KEY)).toBe('{"name":"Ana","bio":null}');
        expect(toastOf(response)?.title).toBe('Profile saved');
    });

    it('keeps the saved profile when the name is longer than 60 characters', () => {
        const before = settingOf(READER_KEY);

        const response = act({
            method: 'PUT',
            url: '/profile',
            body: { name: 'x'.repeat(61) },
        });

        expect(response.status).toBe(200);
        expect(settingOf(READER_KEY)).toBe(before);
        expect(toastOf(response)).toBeNull();
    });
});

describe('profile pins', () => {
    it('pins a book at the end of the pinned list and hides it from the options', () => {
        const response = act({
            method: 'POST',
            url: '/profile/pins',
            body: { book_id: 13 },
        });

        expect(settingOf(PINS_KEY)).toBe('[1,5,6,13]');
        expect(toastOf(response)?.title).toBe('Pinned to profile');
        expect(toastOf(response)?.sub).toBe('A Hora da Estrela');
        expect(pinnedTitles().at(-1)).toBe('A Hora da Estrela');

        const options = profileProps().pin_options as { id: number }[];
        expect(options.some((option) => option.id === 13)).toBe(false);
    });

    it('refuses a seventh pin with the limit message', () => {
        for (const bookId of [13, 3, 4]) {
            act({
                method: 'POST',
                url: '/profile/pins',
                body: { book_id: bookId },
            });
        }
        const before = settingOf(PINS_KEY);

        const response = act({
            method: 'POST',
            url: '/profile/pins',
            body: { book_id: 2 },
        });

        expect(settingOf(PINS_KEY)).toBe(before);
        expect(toastOf(response)?.kind).toBe('error');
        expect(toastOf(response)?.title).toBe('You can pin up to 6 books.');
    });

    it('unpins a book, keeps the others in pin order and offers an undo', () => {
        const response = act({ method: 'DELETE', url: '/profile/pins/5' });

        expect(settingOf(PINS_KEY)).toBe('[1,6]');
        expect(toastOf(response)?.title).toBe('Unpinned');
        expect(toastOf(response)?.sub).toBe('Pequeno Manual Antirracista');
        expect(toastOf(response)?.undo).toEqual(expect.any(String));
    });

    it('answers 404 when the book to unpin does not exist', () => {
        const response = act({ method: 'DELETE', url: '/profile/pins/999' });

        expect(response.status).toBe(404);
        expect(settingOf(PINS_KEY)).toBe('[1,5,6]');
    });
});
