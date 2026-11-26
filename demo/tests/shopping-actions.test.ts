import { afterAll, describe, expect, it } from 'vite-plus/test';
import { getState } from '../src/state/store';
import { restoreClock, resetDemoState, sendRequest } from './harness';

const WANT_TO_READ_BOOK_ID = 12;
const SHOPPING_ITEM_TITLE = 'Livro sem preço';

afterAll(() => {
    restoreClock();
});

describe('moving a want-to-read book to the shopping list', () => {
    it('takes the book off the library and puts an unpriced item on the list', () => {
        resetDemoState({ locale: 'en' });

        const { tables } = getState();
        const title = tables.books.find(
            (book) => book.id === WANT_TO_READ_BOOK_ID,
        )?.title;

        const response = sendRequest({
            method: 'POST',
            url: `/library/${WANT_TO_READ_BOOK_ID}/shopping`,
            currentPath: '/library',
        });

        expect(response.page?.component).toBe('shopping');
        expect(
            getState().tables.books.some(
                (book) => book.id === WANT_TO_READ_BOOK_ID,
            ),
        ).toBe(false);
        expect(
            getState().tables.shopping_items.some(
                (item) => item.title === title && item.bought_at === null,
            ),
        ).toBe(true);
    });

    it('refuses a book that already has sessions', () => {
        resetDemoState({ locale: 'en' });

        const response = sendRequest({
            method: 'POST',
            url: '/library/10/shopping',
            currentPath: '/library',
        });

        expect(response.page?.props.toast).toMatchObject({
            kind: 'error',
        });
        expect(getState().tables.books.some((book) => book.id === 10)).toBe(
            true,
        );
    });
});

describe('shopping list actions', () => {
    it('asks for the price by hand when the item has no ISBN to look it up', () => {
        resetDemoState({ locale: 'en' });

        const response = sendRequest({
            method: 'POST',
            url: '/shopping/1/price',
            currentPath: '/shopping',
        });

        expect(response.page?.props.toast).toMatchObject({
            kind: 'error',
            title: "Can't look up the price without an ISBN",
            sub: 'Enter the price by hand.',
        });
    });

    it('saves the queue-on-buy preference for the next page', () => {
        resetDemoState({ locale: 'en' });

        sendRequest({
            method: 'PUT',
            url: '/shopping/preference',
            body: { queue_on_buy: false },
            currentPath: '/shopping',
        });
        const page = sendRequest({ url: '/shopping' }).page;

        expect(page?.props.queue_on_buy).toBe(false);
    });

    it('adds an item from the form and lists it as pending', () => {
        resetDemoState({ locale: 'en' });

        sendRequest({
            method: 'POST',
            url: '/shopping',
            body: {
                title: SHOPPING_ITEM_TITLE,
                author: 'Machado de Assis',
                isbn: '',
                cover_url: '',
                url: '',
                store_type: 'online',
                estimated_price: '12,50',
            },
            currentPath: '/shopping',
        });
        const page = sendRequest({ url: '/shopping' }).page;
        const items = (page?.props.shopping ?? []) as { title: string }[];
        const added = items.find((item) => item.title === SHOPPING_ITEM_TITLE);

        expect(added).toMatchObject({
            estimated_price_cents: 1250,
            bought: false,
        });
    });
});

describe('suggestion generation', () => {
    it('answers with the no-new-suggestions notice, since the local AI is not available', () => {
        resetDemoState({ locale: 'en' });

        const response = sendRequest({
            method: 'POST',
            url: '/suggestions/generate',
            currentPath: '/suggestions',
        });

        expect(response.page?.component).toBe('suggestions');
        expect(response.page?.props.toast).toMatchObject({
            kind: 'success',
            title: 'No new suggestions',
        });
    });
});
