import { afterAll, describe, expect, it } from 'vite-plus/test';
import { toBrowserUrl } from '../src/server/base-path';
import {
    comparePage,
    formatMismatch,
    loadGoldenPage,
    matchesSlugFilter,
    restoreClock,
    runScenario,
} from './harness';

afterAll(() => {
    restoreClock();
});

describe('golden harness', () => {
    it('filters slugs by comma-separated patterns with wildcards', () => {
        expect(matchesSlugFilter('book-12', 'home,book-*')).toBe(true);
        expect(matchesSlugFilter('home-live', 'home')).toBe(false);
        expect(matchesSlugFilter('home-live', 'home*')).toBe(true);
        expect(matchesSlugFilter('library', undefined)).toBe(true);
    });

    it('reports no mismatch when the served page is the golden page', () => {
        const golden = loadGoldenPage('pt-BR', 'home');
        const served = {
            component: golden.component,
            url: toBrowserUrl('/'),
            props: structuredClone(golden.props),
        };

        const comparison = comparePage(golden, served);

        expect(comparison.mismatches).toEqual([]);
        expect(comparison.extraPaths).toEqual([]);
    });

    it('marks a changed shared prop and ignores a toast id', () => {
        const golden = loadGoldenPage('pt-BR', 'home');
        const props = structuredClone(golden.props);
        props.counts = { books: -1, queue: 0, shopping: 0 };
        props.toast = { id: 'changes-every-run', kind: 'success' };

        const comparison = comparePage(golden, {
            component: golden.component,
            url: toBrowserUrl('/'),
            props,
        });
        const labels = comparison.mismatches.map(formatMismatch);

        expect(labels).toContain(
            '[shared] props.counts.books: expected 14, actual -1',
        );
        expect(
            comparison.mismatches.some((m) => m.path === 'props.toast.id'),
        ).toBe(false);
    });

    it('reports props the server sends that the golden page lacks', () => {
        const golden = loadGoldenPage('en', 'home');
        const comparison = comparePage(golden, {
            component: golden.component,
            url: toBrowserUrl('/'),
            props: { ...structuredClone(golden.props), extra_prop: 1 },
        });

        expect(comparison.extraPaths).toEqual(['props.extra_prop']);
        expect(comparison.mismatches).toEqual([]);
    });

    it('runs a scenario from a fresh state and compares with the golden page', () => {
        const [result] = runScenario({
            locale: 'en',
            steps: [{ url: '/', golden: 'home' }],
        });

        expect(result.response.status).toBe(200);
        expect(result.comparison).not.toBeNull();
    });
});
