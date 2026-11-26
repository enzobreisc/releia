const ISBN_13_PREFIX = '978';
const ISBN_13_LENGTH = 13;
const ISBN_10_LENGTH = 10;
const ISBN_10_BODY_LENGTH = 9;
const ISBN_MODULUS = 11;
const ISBN_13_MODULUS = 10;
const ISBN_10_CHECK_X = 10;
const NON_ISBN_CHARACTERS = /[^0-9Xx]/g;
const ISBN_13_DIGITS = /^\d{13}$/;
const ISBN_10_BODY = /^\d{9}$/;
const BRAZILIAN_ISBN_PREFIXES = ['97885', '97865'] as const;

function digitValues(digits: string): number[] {
    return digits
        .split('')
        .map((digit) => (digit === 'X' ? ISBN_10_CHECK_X : Number(digit)));
}

function checkDigit13(firstTwelve: string): string {
    const sum = digitValues(firstTwelve).reduce(
        (total, value, index) => total + value * (index % 2 === 0 ? 1 : 3),
        0,
    );

    return String(
        (ISBN_13_MODULUS - (sum % ISBN_13_MODULUS)) % ISBN_13_MODULUS,
    );
}

function isValidIsbn13(digits: string): boolean {
    return (
        ISBN_13_DIGITS.test(digits) &&
        checkDigit13(digits.slice(0, ISBN_13_LENGTH - 1)) ===
            digits[ISBN_13_LENGTH - 1]
    );
}

function isValidIsbn10(digits: string): boolean {
    if (!ISBN_10_BODY.test(digits.slice(0, ISBN_10_BODY_LENGTH))) {
        return false;
    }

    const sum = digitValues(digits).reduce(
        (total, value, index) => total + value * (ISBN_10_LENGTH - index),
        0,
    );

    return sum % ISBN_MODULUS === 0;
}

/** The ISBN-13 of a valid ISBN typed with or without hyphens, or null when it is not one. */
export function toIsbn13(value: string): string | null {
    const digits = value.replace(NON_ISBN_CHARACTERS, '').toUpperCase();

    if (digits.length === ISBN_13_LENGTH) {
        return isValidIsbn13(digits) ? digits : null;
    }

    if (digits.length === ISBN_10_LENGTH && isValidIsbn10(digits)) {
        const base = `${ISBN_13_PREFIX}${digits.slice(0, ISBN_10_BODY_LENGTH)}`;

        return `${base}${checkDigit13(base)}`;
    }

    return null;
}

export function isBrazilianIsbn(isbn13: string): boolean {
    return BRAZILIAN_ISBN_PREFIXES.some((prefix) => isbn13.startsWith(prefix));
}

/** Only ISBN-13s with the 978 prefix have an ISBN-10 equivalent. */
export function toIsbn10(isbn13: string): string | null {
    if (
        !isbn13.startsWith(ISBN_13_PREFIX) ||
        isbn13.length !== ISBN_13_LENGTH
    ) {
        return null;
    }

    const body = isbn13.slice(ISBN_13_PREFIX.length, ISBN_13_LENGTH - 1);
    const sum = digitValues(body).reduce(
        (total, value, index) => total + value * (ISBN_10_LENGTH - index),
        0,
    );
    const check = (ISBN_MODULUS - (sum % ISBN_MODULUS)) % ISBN_MODULUS;

    return `${body}${check === ISBN_10_CHECK_X ? 'X' : String(check)}`;
}
