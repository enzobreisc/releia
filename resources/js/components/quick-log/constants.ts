/** Each grid square lights up per minute read; 30 = a full grid. */
export const MINUTE_SQUARES = 30;

/** Every fifth lit square is brighter, so minutes are easy to count. */
export const BRIGHT_EVERY = 5;

export const HEAT_LIT = 2;
export const HEAT_BRIGHT = 3;

export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const MIN_SESSION_MINUTES = 1;

export const RATING_STAR_SIZE = 28;

export const PAGE_JUMPS = [5, 10, 20];

/** Option value that starts a book from the "want to read" shelf. */
export const START_PREFIX = 'start-';

/**
 * Runs the Scriptable script of the lock screen widget (docs/mobile-quick-log.md).
 * iOS only redraws the widget on its own schedule, unless Scriptable runs it in the foreground.
 */
export const WIDGET_REFRESH_URL = 'scriptable:///run/releia';

export const pageInputClass =
    'w-28 in-data-mobile:w-36 [appearance:textfield] bg-transparent text-center font-extrabold tracking-tighter tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none';
