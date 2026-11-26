import { isAmazonUrl } from '../support/amazon-link';
import { isHttpUrl } from '../support/http-url';
import type { StoreType } from '../state/types';
import { toIsbn13 } from '../support/isbn';
import { FormErrors, checkMaxLength } from '../support/form-errors';

export const STORE_TYPES: readonly StoreType[] = [
    'used_bookstore',
    'bookstore',
    'online',
];

const MAX_TITLE_LENGTH = 255;
const MAX_URL_LENGTH = 2048;
const CURRENCY_NOISE = /R\$| | /g;
const DECIMAL_PRICE = /^\d+(\.\d{1,2})?$/;
const CENTS_DIGITS = 2;
const CENTS_PER_UNIT = 100;
const AMAZON_PRODUCT_PATH =
    /\/(?:dp|gp\/product|o\/ASIN)\/([0-9]{9}[0-9X])(?:[/?]|$)/i;

export type ShoppingItemInput = {
    title: string;
    author: string;
    isbn: string | null;
    cover_url: string | null;
    url: string | null;
    store_type: StoreType;
    estimated_price_cents: number | null;
};

/** The last separator is the decimal one: "1.234,56" and "1,234.56" both mean 1234.56. */
function normalizeSeparators(value: string): string {
    if (!value.includes(',')) {
        return value;
    }

    return value.lastIndexOf('.') > value.lastIndexOf(',')
        ? value.replace(/,/g, '')
        : value.replace(/\./g, '').replace(/,/g, '.');
}

/** Money::parseReais: "34,90" or "34.90" as whole cents, null when empty or not a price. */
export function parseReais(value: string | null): number | null {
    const cleaned = (value ?? '').replace(CURRENCY_NOISE, '');

    if (cleaned === '') {
        return null;
    }

    const normalized = normalizeSeparators(cleaned);

    if (!DECIMAL_PRICE.test(normalized)) {
        return null;
    }

    const [reais, fraction = ''] = normalized.split('.');
    const cents = fraction.slice(0, CENTS_DIGITS).padEnd(CENTS_DIGITS, '0');

    return Number(reais) * CENTS_PER_UNIT + Number(cents);
}

/** AmazonLink::isbnFromUrl: the ISBN-10 used as ASIN in a product link, as ISBN-13. */
export function isbnFromAmazonUrl(url: string): string | null {
    if (!isAmazonUrl(url)) {
        return null;
    }

    const match = AMAZON_PRODUCT_PATH.exec(new URL(url).pathname);

    return match === null ? null : toIsbn13(match[1]);
}

export function isStoreType(value: string): value is StoreType {
    return STORE_TYPES.some((storeType) => storeType === value);
}

/** The request's text field, trimmed the way the framework trims input; "" when absent. */
export function textField(body: Record<string, unknown>, key: string): string {
    const value = body[key];

    return typeof value === 'string' ? value.trim() : '';
}

const PRICE_FORMAT_MESSAGE = 'Preço inválido. Use o formato 34,90.';

function isbnOf(isbn: string, url: string | null): string | null {
    if (isbn !== '') {
        return toIsbn13(isbn);
    }

    return url === null ? null : isbnFromAmazonUrl(url);
}

/** The price a form sends: null when blank, and a field error when it is not a price. */
export function priceOf(errors: FormErrors, value: string): number | null {
    if (value === '') {
        return null;
    }

    const cents = parseReais(value);

    if (cents === null) {
        errors.add('estimated_price', PRICE_FORMAT_MESSAGE);
    }

    return cents;
}

/** ShoppingItemRequest: every failing rule adds its error to `errors`. */
export function shoppingItemInput(
    body: Record<string, unknown>,
    errors: FormErrors,
): ShoppingItemInput {
    const title = textField(body, 'title');
    const author = textField(body, 'author');
    const isbn = textField(body, 'isbn');
    const coverUrl = textField(body, 'cover_url');
    const url = textField(body, 'url');
    const storeType = textField(body, 'store_type');

    if (title === '') {
        errors.add('title', 'O campo título é obrigatório.');
    }

    checkMaxLength(
        errors,
        'title',
        title,
        MAX_TITLE_LENGTH,
        'O campo título deve ter no máximo :max caracteres.',
    );
    checkMaxLength(
        errors,
        'author',
        author,
        MAX_TITLE_LENGTH,
        'O campo autor deve ter no máximo :max caracteres.',
    );

    if (isbn !== '' && toIsbn13(isbn) === null) {
        errors.add('isbn', 'ISBN inválido.');
    }

    checkLink(
        errors,
        'cover_url',
        coverUrl,
        'O campo capa deve ser um link válido.',
        'O campo capa deve ter no máximo :max caracteres.',
    );
    checkLink(
        errors,
        'url',
        url,
        'O campo link deve ser um link válido.',
        'O campo link deve ter no máximo :max caracteres.',
    );

    if (storeType === '') {
        errors.add('store_type', 'O campo loja é obrigatório.');
    } else if (!isStoreType(storeType)) {
        errors.add('store_type', 'O valor escolhido para loja é inválido.');
    }

    const price = priceOf(errors, textField(body, 'estimated_price'));

    return {
        title,
        author,
        isbn: isbnOf(isbn, url === '' ? null : url),
        cover_url: coverUrl === '' ? null : coverUrl,
        url: url === '' ? null : url,
        store_type: isStoreType(storeType) ? storeType : STORE_TYPES[0],
        estimated_price_cents: price,
    };
}

/** A link the form may leave blank: http or https, and at most 2048 characters. */
function checkLink(
    errors: FormErrors,
    field: string,
    value: string,
    invalid: string,
    tooLong: string,
): void {
    if (value === '') {
        return;
    }

    if (!isHttpUrl(value)) {
        errors.add(field, invalid);
    }

    checkMaxLength(errors, field, value, MAX_URL_LENGTH, tooLong);
}
