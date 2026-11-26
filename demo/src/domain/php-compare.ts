import { compareText } from '../support/collections';

export type PhpValue = number | string;

/** Decimal numbers, optionally padded with whitespace: PHP 8 compares two of them as numbers. */
const NUMERIC_STRING =
    /^[ \t\n\r\v\f]*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?[ \t\n\r\v\f]*$/;

function compareNumbers(left: number, right: number): number {
    return Math.sign(left - right);
}

function compareStrings(left: string, right: string): number {
    if (NUMERIC_STRING.test(left) && NUMERIC_STRING.test(right)) {
        return compareNumbers(Number(left), Number(right));
    }

    return compareText(left, right);
}

/** PHP `<=>` for one pair of sort values. */
function comparePhpValues(left: PhpValue, right: PhpValue): number {
    if (typeof left === 'number' && typeof right === 'number') {
        return compareNumbers(left, right);
    }

    return compareStrings(String(left), String(right));
}

/** PHP `<=>` on arrays: the first differing element decides. */
export function comparePhpKeys(
    left: readonly PhpValue[],
    right: readonly PhpValue[],
): number {
    const rightValues = right[Symbol.iterator]();

    for (const value of left) {
        const next = rightValues.next();

        if (next.done === true) {
            return 1;
        }

        const result = comparePhpValues(value, next.value);

        if (result !== 0) {
            return result;
        }
    }

    return rightValues.next().done === true ? 0 : -1;
}
