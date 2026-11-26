import { afterAll, describe, expect, it } from 'vite-plus/test';
import { restoreClock, runGoldenSuite } from './harness';

afterAll(() => {
    restoreClock();
});

describe('golden pages', () => {
    it('match the pages the PHP app renders for demo/data/state.json', () => {
        const report = runGoldenSuite({ slugFilter: process.env.DEMO_SLUGS });

        process.stdout.write(`${report.lines.join('\n')}\n${report.summary}\n`);

        expect(report.failed, report.summary).toBe(0);
    });
});
