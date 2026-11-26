import { translateText } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Toast } from '@/types';
import { editionsOfWork, searchBooks } from '../external/book-search';
import { createReadModel } from '../domain/read-model';
import {
    addSuggestionToLibrary,
    canAddSuggestion,
    settleSuggestion,
} from '../domain/suggestions-writes';
import { captureUndo, rememberUndo, undoScope } from '../domain/undo';
import {
    suggestionEditions,
    suggestionsPageProps,
} from '../presenters/suggestions';
import {
    json,
    redirect,
    redirectBack,
    render,
    route,
    successToast,
    type RouteContext,
} from '../server/router';
import type {
    DemoState,
    RecommendationRow,
    RecommendationStatus,
} from '../state/types';
import { candidatePayloads } from '../presenters/candidates';
import { integerOrNull, plainSuccessToast } from './route-input';

const EDITIONS_TIMEOUT_MS = 8000;

const SUGGESTIONS_PATH = '/suggestions';
const NOT_FOUND_TITLE = 'Página não encontrada';
const ISBN_FIELD = 'isbn_13';

type Params = RouteContext['params'];

function recommendationOf(
    state: DemoState,
    params: Params,
): RecommendationRow | undefined {
    const id = integerOrNull(params.recommendation);

    return state.tables.recommendations.find((row) => row.id === id);
}

/** The edition the reader picked in the list, if they picked one. */
function chosenIsbnOf(body: RouteContext['body']): string | null {
    const value = body[ISBN_FIELD];

    return typeof value === 'string' && value.trim() !== ''
        ? value.trim()
        : null;
}

/** Book::latest('id'): the book the last addition created. */
function newestBookId(state: DemoState): number {
    return Math.max(0, ...state.tables.books.map((book) => book.id));
}

function notFound(locale: Locale) {
    return json({ message: translateText(locale, NOT_FOUND_TITLE) }, 404);
}

/**
 * Adds the suggestion (or the chosen edition) on the given shelf and closes it with the
 * status its answer gives. Returns whether a book was created.
 */
function answerSuggestion(
    context: RouteContext,
    recommendation: RecommendationRow,
    shelf: 'want_to_read' | 'read',
    status: RecommendationStatus,
): boolean {
    const { state, today, body } = context;
    const chosen = chosenIsbnOf(body);
    const addable = canAddSuggestion(
        createReadModel(state, today, new Date()),
        recommendation,
        chosen,
    );

    if (addable) {
        addSuggestionToLibrary(
            state,
            recommendation,
            shelf,
            chosen,
            new Date(),
        );
    }

    settleSuggestion(recommendation, status);

    return addable;
}

function addedToLibraryToast(
    context: RouteContext,
    recommendation: RecommendationRow,
    title: string,
    action: Toast['action'],
): Toast {
    return {
        ...plainSuccessToast(
            translateText(context.locale, title),
            recommendation.title,
        ),
        action,
    };
}

route('GET', SUGGESTIONS_PATH, ({ state, today, query }) => {
    const model = createReadModel(state, today, new Date());
    const text = (query.get('q') ?? '').trim();

    if (text === '') {
        return render('suggestions', suggestionsPageProps(model, text, []));
    }

    return searchResults(state, today, text);
});

async function searchResults(state: DemoState, today: string, text: string) {
    const found = await searchBooks(text, null);
    const model = createReadModel(state, today, new Date());

    return render(
        'suggestions',
        suggestionsPageProps(model, text, candidatePayloads(state, found)),
    );
}

route('POST', '/suggestions/generate', ({ locale }) =>
    redirect(SUGGESTIONS_PATH, {
        toast: plainSuccessToast(
            translateText(locale, 'Nenhuma sugestão nova'),
        ),
    }),
);

route('GET', '/suggestions/{recommendation}/editions', async (context) => {
    const { state, params } = context;
    const recommendation = recommendationOf(state, params);

    if (recommendation === undefined) {
        return notFound(context.locale);
    }

    const workEditions =
        recommendation.work_key === null
            ? []
            : await editionsOfWork(recommendation.work_key, {
                  timeoutMs: EDITIONS_TIMEOUT_MS,
              }).catch(() => []);

    return json({
        items: suggestionEditions(state, recommendation, workEditions),
    });
});

route('PATCH', '/suggestions/{recommendation}/accept', (context) => {
    const { state, params, locale } = context;
    const recommendation = recommendationOf(state, params);

    if (recommendation === undefined) {
        return redirectBack();
    }

    const added = answerSuggestion(
        context,
        recommendation,
        'want_to_read',
        'want_to_read',
    );

    if (!added) {
        return redirectBack({
            toast: plainSuccessToast(
                translateText(locale, 'Esse livro já está na biblioteca'),
                recommendation.title,
            ),
        });
    }

    return redirectBack({
        toast: addedToLibraryToast(
            context,
            recommendation,
            'Adicionado a Quero ler',
            {
                label: translateText(locale, 'Pôr na fila'),
                method: 'post',
                url: '/queue/books',
                data: { book_id: newestBookId(state) },
            },
        ),
    });
});

route('PATCH', '/suggestions/{recommendation}/already-read', (context) => {
    const { state, params, locale } = context;
    const recommendation = recommendationOf(state, params);

    if (recommendation === undefined) {
        return redirectBack();
    }

    const added = answerSuggestion(
        context,
        recommendation,
        'read',
        'dismissed',
    );

    if (!added) {
        return redirectBack({
            toast: plainSuccessToast(
                translateText(locale, 'Esse livro já está na biblioteca'),
                recommendation.title,
            ),
        });
    }

    return redirectBack({
        toast: {
            ...plainSuccessToast(
                translateText(locale, 'Adicionado como lido'),
                recommendation.title,
            ),
            action: {
                label: translateText(locale, 'Avaliar'),
                method: 'get',
                url: `/library/${newestBookId(state)}`,
            },
        },
    });
});

route(
    'PATCH',
    '/suggestions/{recommendation}/dismiss',
    ({ state, params, locale }) => {
        const recommendation = recommendationOf(state, params);

        if (recommendation === undefined) {
            return redirectBack();
        }

        const snapshot = captureUndo(state, [
            undoScope('recommendations', { id: recommendation.id }),
        ]);

        settleSuggestion(recommendation, 'dismissed');

        return redirectBack({
            toast: {
                ...successToast(
                    translateText(locale, 'Sugestão dispensada'),
                    recommendation.title,
                ),
                undo: rememberUndo(snapshot),
            },
        });
    },
);
