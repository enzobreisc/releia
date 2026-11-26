import { readFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vite-plus/test';
import type { HttpMethod } from '../src/server/router';
import {
    type GoldenLocale,
    type Mismatch,
    type ServedResponse,
    compareResponse,
    formatMismatch,
    loadGoldenPage,
    resetDemoState,
    restoreClock,
    sendRequest,
} from './harness';

const SCENARIOS_FILE = new URL('../golden/scenarios.json', import.meta.url);
const LIST_SCENARIOS = ['queue', 'shopping', 'suggestions'] as const;
const LOCALES: readonly GoldenLocale[] = ['pt-BR', 'en'];
/** The golden pages record the undo token as this placeholder, since each run draws a new one. */
const UNDO_PLACEHOLDER = 'undo-token';

type ScenarioStepDefinition = {
    step: string;
    method: HttpMethod;
    url: string;
    body?: Record<string, unknown>;
    golden: string;
};

type ScenarioFile = Record<string, ScenarioStepDefinition[]>;

function loadScenarios(): ScenarioFile {
    return JSON.parse(readFileSync(SCENARIOS_FILE, 'utf8')) as ScenarioFile;
}

function withUndoPlaceholder(response: ServedResponse): ServedResponse {
    const { page } = response;
    const toast = page?.props.toast;

    if (page === null || typeof toast !== 'object' || toast === null) {
        return response;
    }

    const undo = (toast as { undo?: unknown }).undo;

    if (typeof undo !== 'string') {
        return response;
    }

    return {
        ...response,
        page: {
            ...page,
            props: {
                ...page.props,
                toast: { ...toast, undo: UNDO_PLACEHOLDER },
            },
        },
    };
}

/**
 * Runs one scenario from a fresh export. Each step is sent from the page its golden
 * was recorded on, so the redirect back lands where the reader was.
 */
function runListScenario(name: string, locale: GoldenLocale): Mismatch[] {
    resetDemoState({ locale });

    return (loadScenarios()[name] ?? []).flatMap((step) => {
        const golden = loadGoldenPage(
            locale,
            `scenarios/${name}/${step.step}-${step.golden}`,
        );
        const response = withUndoPlaceholder(
            sendRequest({
                method: step.method,
                url: step.url,
                body: step.body,
                currentPath: golden.url,
            }),
        );

        return compareResponse(golden, response).mismatches.map((mismatch) => ({
            ...mismatch,
            path: `${step.step}: ${mismatch.path}`,
        }));
    });
}

afterAll(() => {
    restoreClock();
});

describe('list scenarios', () => {
    for (const locale of LOCALES) {
        for (const name of LIST_SCENARIOS) {
            it(`${name} matches the golden pages in ${locale}`, () => {
                const mismatches = runListScenario(name, locale).map(
                    formatMismatch,
                );

                expect(mismatches).toEqual([]);
            });
        }
    }
});
