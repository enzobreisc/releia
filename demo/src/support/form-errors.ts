import { translateText, type Locale, type Replacements } from '@/lib/i18n';

/** Laravel's `errors` prop for the default bag: the first message of each field, keyed by the field's name. */
export type FieldErrors = Record<string, string>;

/**
 * A write the app refuses with messages beside its fields, as a ValidationException does.
 * Routes that serve a form send the errors back; the others show the first one as a notice.
 */
export class WriteRejected extends Error {
    readonly errors: FieldErrors;

    constructor(errors: FieldErrors) {
        super(Object.values(errors)[0] ?? '');
        this.errors = errors;
    }
}

/**
 * The errors of one request, collected the way a validator collects them: every rule is checked,
 * and a field keeps its first message.
 */
export class FormErrors {
    private readonly fields: FieldErrors = {};

    constructor(private readonly locale: Locale) {}

    add(field: string, text: string, replacements?: Replacements): void {
        if (Object.hasOwn(this.fields, field)) {
            return;
        }

        this.fields[field] = translateText(this.locale, text, replacements);
    }

    /** For an error whose value is not text, such as the id of the other book that owns an ISBN. */
    addValue(field: string, value: string): void {
        if (!Object.hasOwn(this.fields, field)) {
            this.fields[field] = value;
        }
    }

    /** Stops the request before it saves anything, when any rule failed. */
    throwIfAny(): void {
        if (Object.keys(this.fields).length > 0) {
            throw new WriteRejected({ ...this.fields });
        }
    }
}

/** The `max` rule for a text: a longer value fails, counted in characters as the framework counts them. */
export function checkMaxLength(
    errors: FormErrors,
    field: string,
    value: string | null,
    max: number,
    text: string,
): void {
    if (value !== null && Array.from(value).length > max) {
        errors.add(field, text, { max });
    }
}

const DAY_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const WHOLE_NUMBER = /^-?\d+$/;

export type NumberRange = { min: number; max: number };

/**
 * The `integer` and `between` rules of a field the form sends as text or as a number. A blank value is
 * absent (null); any other value that is not a whole number in range fails with `text`.
 */
export function wholeNumberField(
    errors: FormErrors,
    field: string,
    value: unknown,
    range: NumberRange,
    text: string,
    replacements?: Replacements,
): number | null {
    const raw =
        typeof value === 'number'
            ? String(value)
            : typeof value === 'string'
              ? value.trim()
              : '';

    if (raw === '') {
        return null;
    }

    const number = Number(raw);

    if (!WHOLE_NUMBER.test(raw) || number < range.min || number > range.max) {
        errors.add(field, text, replacements);

        return null;
    }

    return number;
}

export function isDayText(value: string): boolean {
    return DAY_FORMAT.test(value);
}

/** The `date_format:Y-m-d` rule: a value of another shape fails. */
export function checkDayFormat(
    errors: FormErrors,
    field: string,
    value: string | null,
    text: string,
): void {
    if (value !== null && !isDayText(value)) {
        errors.add(field, text, { format: 'Y-m-d' });
    }
}

/** A domain refusal for one field, for a write the app checks while it saves. */
export function rejectField(
    locale: Locale,
    field: string,
    text: string,
    replacements?: Replacements,
): never {
    throw new WriteRejected({
        [field]: translateText(locale, text, replacements),
    });
}
