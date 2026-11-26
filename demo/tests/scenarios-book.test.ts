import { afterAll, describe, expect, it } from 'vite-plus/test';
import {
    type GoldenLocale,
    replayScenario,
    reportReplay,
    restoreClock,
    runGoldenSuite,
} from './harness';

const LOCALES: readonly GoldenLocale[] = ['pt-BR', 'en'];
const SCENARIOS = ['finish-reading', 'sessions-notes', 'undo'] as const;

afterAll(() => {
    restoreClock();
});

describe('book pages in the golden suite', () => {
    it('match the pages the PHP app renders for every book-* slug', () => {
        const report = runGoldenSuite({ slugFilter: 'book-*' });

        process.stdout.write(`${report.lines.join('\n')}\n${report.summary}\n`);

        expect(report.failed, report.summary).toBe(0);
    });
});

describe.each(LOCALES)('book scenarios [%s]', (locale) => {
    it.each(SCENARIOS)(
        'replays %s with the same pages as the PHP app',
        (scenario) => {
            const report = reportReplay(
                scenario,
                locale,
                replayScenario(locale, scenario),
            );

            process.stdout.write(report.text);

            expect(report.failing, report.summary).toBe(0);
        },
    );
});
