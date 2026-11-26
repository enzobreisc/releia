const MILLISECONDS_PER_MINUTE = 60_000;
/** The app's timezone, America/Sao_Paulo (config/app.php), which has no daylight saving time. */
const APP_UTC_OFFSET_MINUTES = -180;
const APP_OFFSET_TEXT = '-03:00';
const ISO_WITHOUT_OFFSET_LENGTH = 19;

/** The instant as the app writes it: ISO 8601 in the app's timezone, e.g. "2026-11-26T12:00:00-03:00". */
export function appIsoTimestamp(instant: Date): string {
    const wallClock = new Date(
        instant.getTime() + APP_UTC_OFFSET_MINUTES * MILLISECONDS_PER_MINUTE,
    );

    return `${wallClock.toISOString().slice(0, ISO_WITHOUT_OFFSET_LENGTH)}${APP_OFFSET_TEXT}`;
}
