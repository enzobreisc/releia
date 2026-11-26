import {
    afterAll,
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import { clearLookupCache } from '../src/external/book-search';
import { dispatch, dispatchAsync } from '../src/server/dispatch';
import { ONLY_IN_APP_PAGE } from '../src/shell/constants';
import { resetDemoState, restoreClock } from './harness';

const SEARCH_PATH = '/library/add?q=Torto%20Arado';
const TORTO_ARADO_DOC = {
    key: '/works/OL123W',
    title: 'Torto Arado',
    author_name: ['Itamar Vieira Junior'],
    first_publish_year: 2019,
};

beforeEach(() => {
    clearLookupCache();
    vi.stubGlobal(
        'fetch',
        async () =>
            new Response(JSON.stringify({ docs: [TORTO_ARADO_DOC] }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }),
    );
});

afterEach(() => {
    vi.unstubAllGlobals();
});

afterAll(() => {
    restoreClock();
});

describe('dispatchAsync', () => {
    it('renders a redirect target whose handler awaits the network', async () => {
        resetDemoState({ locale: 'pt-BR' });

        const response = await dispatchAsync({
            method: 'POST',
            url: '/library',
            body: {},
            headers: { 'x-inertia': 'true' },
            currentPath: SEARCH_PATH,
        });
        const page = JSON.parse(response.body) as {
            component: string;
            props: {
                results: { title: string }[];
                toast: { kind: string } | null;
            };
        };

        expect(response.status).toBe(200);
        expect(page.component).toBe('add-book');
        expect(page.props.results[0]?.title).toBe('Torto Arado');
        expect(page.props.toast?.kind).toBe('error');
    });

    it('answers a malformed percent-encoded address with the only-in-app page', () => {
        resetDemoState({ locale: 'pt-BR' });

        const response = dispatch({
            method: 'GET',
            url: '/library/100%',
            body: {},
            headers: { 'x-inertia': 'true' },
            currentPath: '/library/100%',
        });
        const page = JSON.parse(response.body) as { component: string };

        expect(response.status).toBe(200);
        expect(page.component).toBe(ONLY_IN_APP_PAGE);
    });
});
