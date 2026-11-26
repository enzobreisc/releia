import { afterAll, describe, expect, it } from 'vite-plus/test';
import {
    type GoldenLocale,
    replayScenario,
    reportReplay,
    restoreClock,
} from './harness';

const LOCALES: readonly GoldenLocale[] = ['pt-BR', 'en'];
const SCENARIOS = ['live-session', 'quick-log'] as const;

afterAll(() => {
    restoreClock();
});

describe.each(LOCALES)('session scenarios [%s]', (locale) => {
    it.each(SCENARIOS)(
        'replays %s with the same pages as the PHP app',
        (scenario) => {
            const report = reportReplay(
                scenario,
                locale,
                replayScenario(locale, scenario, { allDumps: true }),
            );

            process.stdout.write(report.text);

            expect(report.failing, report.summary).toBe(0);
        },
    );
});
