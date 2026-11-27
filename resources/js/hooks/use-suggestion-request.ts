import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { jsonPostHeaders } from '@/lib/http';
import {
    interpret as interpretRoute,
    store,
} from '@/routes/suggestions/requests';
import type {
    RequestFilters,
    SuggestionAvailability,
    SuggestionRequest,
} from '@/types';

export type ResultTab = 'result' | 'pending';

export type RequestActions = {
    submitForm: (event: FormEvent) => void;
    pickExample: (example: string) => void;
    retry: () => void;
    cancel: () => void;
    dropPageLimit: () => void;
    checkAvailabilityAgain: () => void;
    focusField: () => void;
};

type UnavailableAvailability = Exclude<SuggestionAvailability, 'ready'>;

type FilterSource = Pick<
    SuggestionRequest,
    'authors' | 'excluded_authors' | 'max_pages'
>;

type Interpretation = FilterSource & { understood: boolean };

type SearchAttempt = { text: string; filters: RequestFilters };

export type FailureReason = 'timeout' | 'open-library' | 'unknown';

type Phase =
    | { step: 'idle' }
    | { step: 'interpreting' }
    | { step: 'searching'; attempt: SearchAttempt }
    | { step: 'not-understood' }
    | { step: 'failed'; reason: FailureReason; search: SearchAttempt | null };

export type RequestNotice =
    | { kind: 'interpreting' }
    | { kind: 'searching' }
    | { kind: 'unavailable'; availability: UnavailableAvailability }
    | { kind: 'not-understood' }
    | { kind: 'failed'; reason: FailureReason }
    | { kind: 'few-results'; count: number; hasPageLimit: boolean }
    | { kind: 'no-results' };

const UNAVAILABLE_STATUS = 503;
const TIMEOUT_STATUS = 504;
const FEW_RESULTS_LIMIT = 2;

function filtersOf(source: FilterSource): RequestFilters {
    return {
        authors: source.authors,
        excludedAuthors: source.excluded_authors,
        maxPages: source.max_pages,
    };
}

function noticeOf(
    phase: Phase,
    availability: SuggestionAvailability | undefined,
    request: SuggestionRequest | null,
): RequestNotice | null {
    if (phase.step === 'interpreting') {
        return { kind: 'interpreting' };
    }

    if (phase.step === 'searching') {
        return { kind: 'searching' };
    }

    if (availability !== undefined && availability !== 'ready') {
        return { kind: 'unavailable', availability };
    }

    if (phase.step === 'not-understood') {
        return { kind: 'not-understood' };
    }

    if (phase.step === 'failed') {
        return { kind: 'failed', reason: phase.reason };
    }

    if (request === null) {
        return null;
    }

    if (request.found === 0) {
        return { kind: 'no-results' };
    }

    if (request.results.length === 0) {
        return null;
    }

    if (request.found <= FEW_RESULTS_LIMIT) {
        return {
            kind: 'few-results',
            count: request.found,
            hasPageLimit: request.max_pages !== null,
        };
    }

    return null;
}

function filtersShownFor(
    phase: Phase,
    request: SuggestionRequest | null,
): RequestFilters | null {
    if (phase.step === 'searching') {
        return phase.attempt.filters;
    }

    if (phase.step === 'failed' && phase.search !== null) {
        return phase.search.filters;
    }

    return phase.step === 'idle' && request !== null
        ? filtersOf(request)
        : null;
}

/**
 * The request flow: the model reads the text into filters (interpreting), then the books are searched
 * with them (searching). A cancelled or unmounted interpretation never reaches the search.
 */
export function useSuggestionRequest({
    request,
    interpreterAvailability,
}: {
    request: SuggestionRequest | null;
    interpreterAvailability: SuggestionAvailability | undefined;
}) {
    const [text, setText] = useState(request?.text ?? '');
    const [phase, setPhase] = useState<Phase>({ step: 'idle' });
    const [tab, setTab] = useState<ResultTab>('result');
    const [reportedUnavailable, setReportedUnavailable] =
        useState<UnavailableAvailability | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const interpretation = useRef<AbortController | null>(null);
    const fieldRef = useRef<HTMLInputElement>(null);

    useEffect(
        () => () => {
            interpretation.current?.abort();
        },
        [],
    );

    const availability = reportedUnavailable ?? interpreterAvailability;
    const isReady = availability === 'ready' && !isChecking;
    const isBusy =
        phase.step === 'interpreting' ||
        phase.step === 'searching' ||
        isChecking;
    const isFieldDisabled = !isReady || isBusy;
    const notice = noticeOf(phase, availability, request);

    function search(attempt: SearchAttempt) {
        let settled = false;
        setPhase({ step: 'searching', attempt });

        router.post(
            store(),
            {
                text: attempt.text,
                authors: attempt.filters.authors,
                excluded_authors: attempt.filters.excludedAuthors,
                max_pages: attempt.filters.maxPages,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    settled = true;
                    setPhase({ step: 'idle' });
                    setTab('result');
                },
                onError: (errors) => {
                    settled = true;
                    setPhase({
                        step: 'failed',
                        reason: 'search' in errors ? 'open-library' : 'unknown',
                        search: attempt,
                    });
                },
                onFinish: () => {
                    if (!settled) {
                        setPhase({
                            step: 'failed',
                            reason: 'unknown',
                            search: attempt,
                        });
                    }
                },
            },
        );
    }

    async function interpret(requested: string) {
        const controller = new AbortController();
        interpretation.current = controller;
        setPhase({ step: 'interpreting' });

        try {
            const response = await fetch(interpretRoute.url(), {
                method: 'POST',
                headers: jsonPostHeaders(),
                body: JSON.stringify({ text: requested }),
                signal: controller.signal,
            });

            if (response.status === TIMEOUT_STATUS) {
                if (!controller.signal.aborted) {
                    setPhase({
                        step: 'failed',
                        reason: 'timeout',
                        search: null,
                    });
                }

                return;
            }

            if (response.status === UNAVAILABLE_STATUS) {
                const body = (await response.json()) as {
                    availability: UnavailableAvailability;
                };

                if (!controller.signal.aborted) {
                    setReportedUnavailable(body.availability);
                    setPhase({ step: 'idle' });
                }

                return;
            }

            if (!response.ok) {
                throw new Error(`Interpret request failed: ${response.status}`);
            }

            const answer = (await response.json()) as Interpretation;

            if (controller.signal.aborted) {
                return;
            }

            if (!answer.understood) {
                setPhase({ step: 'not-understood' });

                return;
            }

            search({ text: requested, filters: filtersOf(answer) });
        } catch {
            if (!controller.signal.aborted) {
                setPhase({ step: 'failed', reason: 'unknown', search: null });
            }
        }
    }

    function submit(requested: string) {
        const trimmed = requested.trim();

        if (trimmed === '' || !isReady || isBusy) {
            return;
        }

        setText(trimmed);
        void interpret(trimmed);
    }

    function submitForm(event: FormEvent) {
        event.preventDefault();
        submit(text);
    }

    function cancel() {
        interpretation.current?.abort();
        setPhase({ step: 'idle' });
    }

    function retry() {
        if (phase.step === 'failed' && phase.search !== null) {
            search(phase.search);

            return;
        }

        submit(text);
    }

    function dropPageLimit() {
        if (request === null || isBusy) {
            return;
        }

        search({
            text: request.text,
            filters: { ...filtersOf(request), maxPages: null },
        });
    }

    function checkAvailabilityAgain() {
        setReportedUnavailable(null);
        setIsChecking(true);
        router.reload({
            only: ['interpreterAvailability'],
            onFinish: () => setIsChecking(false),
        });
    }

    function focusField() {
        fieldRef.current?.focus();
    }

    const actions: RequestActions = {
        submitForm,
        pickExample: submit,
        retry,
        cancel,
        dropPageLimit,
        checkAvailabilityAgain,
        focusField,
    };

    return {
        text,
        setText,
        fieldRef,
        isBusy,
        isFieldDisabled,
        isSubmitDisabled: isFieldDisabled || text.trim() === '',
        isChecking,
        notice,
        canDropPageLimit: notice?.kind === 'few-results' && notice.hasPageLimit,
        filters: filtersShownFor(phase, request),
        answeredEveryBook:
            request !== null &&
            request.found > 0 &&
            request.results.length === 0,
        tab,
        setTab,
        showsResults: request !== null && phase.step !== 'searching',
        actions,
    };
}

export type SuggestionRequestFlow = ReturnType<typeof useSuggestionRequest>;
