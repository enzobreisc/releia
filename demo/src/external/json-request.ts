export const REQUEST_TIMEOUT_MS = 10_000;

/** What a server said. `null` when no answer came: a network error or a timeout. */
type JsonAnswer = { status: number; body: unknown } | null;

const HTTP_OK_MIN = 200;
const HTTP_OK_MAX = 299;

/**
 * Asks the network for JSON. The browser cannot send the User-Agent the app sends, so the
 * request uses the defaults. Aborts after `timeoutMs`, as the app's HTTP client does.
 */
export async function requestJson(
    url: string,
    timeoutMs: number,
): Promise<JsonAnswer> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await globalThis.fetch(url, {
            headers: { accept: 'application/json' },
            signal: controller.signal,
        });

        return { status: response.status, body: await response.json() };
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

function isSuccessful(answer: NonNullable<JsonAnswer>): boolean {
    return answer.status >= HTTP_OK_MIN && answer.status <= HTTP_OK_MAX;
}

export type JsonClient = {
    /** The body of a successful answer, or null: the app's client returns an empty array then. */
    get(path: string, query: Record<string, string>): Promise<unknown>;
    hasJustFailed(): boolean;
};

const FAILURES_TO_GIVE_UP = 3;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR = 500;

/**
 * Tracks whether one service is answering during a lookup. After a few failures in a row it is
 * left alone, since each further call would wait for its timeout. One client serves one lookup.
 */
export function createJsonClient(
    baseUrl: string,
    timeoutMs: number,
): JsonClient {
    let consecutiveFailures = 0;

    function recordAnswer(answer: JsonAnswer): void {
        const failed =
            answer === null ||
            answer.status >= HTTP_SERVER_ERROR ||
            answer.status === HTTP_TOO_MANY_REQUESTS;

        consecutiveFailures = failed ? consecutiveFailures + 1 : 0;
    }

    return {
        async get(path, query) {
            if (consecutiveFailures >= FAILURES_TO_GIVE_UP) {
                return null;
            }

            const url = `${baseUrl}${path}?${new URLSearchParams(query)}`;
            const answer = await requestJson(url, timeoutMs);

            recordAnswer(answer);

            if (answer === null || !isSuccessful(answer)) {
                return null;
            }

            return answer.body;
        },
        hasJustFailed: () => consecutiveFailures > 0,
    };
}
