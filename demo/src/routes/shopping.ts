import { ordinal, translateText } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Toast } from '@/types';
import type { ShoppingMatches } from '@/types/queue';
import { searchBooks } from '../external/book-search';
import { candidatePayloads } from '../presenters/candidates';
import { createReadModel } from '../domain/read-model';
import {
    findShoppingItem,
    isQueueOnBuy,
    isShoppingSort,
    type ShoppingFilter,
} from '../domain/shopping';
import {
    isStoreType,
    isbnFromAmazonUrl,
    parseReais,
    shoppingItemInput,
    textField,
} from '../domain/shopping-input';
import { findQueueItemOfBook } from '../domain/queue-writes';
import {
    addShoppingItem,
    buyShoppingItem,
    canMoveToShopping,
    deleteShoppingItems,
    moveBookToShopping,
    setQueueOnBuy,
    setShoppingPrice,
    setShoppingPriority,
    unbuyShoppingItem,
} from '../domain/shopping-writes';
import {
    captureUndo,
    forgetUndo,
    rememberUndo,
    undoScope,
    type UndoSnapshot,
} from '../domain/undo';
import { shoppingPageProps } from '../presenters/shopping-page';
import { formatMoney } from '../support/money';
import {
    errorToast,
    redirect,
    redirectBack,
    render,
    route,
    successToast,
    type RouteContext,
} from '../server/router';
import type { DemoState, ShoppingItemRow } from '../state/types';
import {
    flagOrNull,
    idsFromBody,
    integerOrNull,
    plainSuccessToast,
    truthyFlag,
} from './route-input';

const SHOPPING_PATH = '/shopping';
const MATCH_LIMIT = 5;
const LINK_PATTERN = /^https?:\/\//i;
const UNAVAILABLE_TITLE = 'Disponível só no app';
const UNAVAILABLE_SUB = 'Na demo, esta ação só funciona no app.';

function itemOfParam(
    state: DemoState,
    params: RouteContext['params'],
): ShoppingItemRow | undefined {
    const itemId = integerOrNull(params.shoppingItem);

    return itemId === null ? undefined : findShoppingItem(state, itemId);
}

/** Items named in the request, in id order; undefined when any id is unknown. */
function selectedItems(
    state: DemoState,
    body: RouteContext['body'],
): ShoppingItemRow[] | undefined {
    const ids = idsFromBody(body.ids);

    if (ids === null) {
        return undefined;
    }

    const items = ids.map((id) => findShoppingItem(state, id));

    if (items.some((item) => item === undefined)) {
        return undefined;
    }

    return items
        .filter((item): item is ShoppingItemRow => item !== undefined)
        .sort((left, right) => left.id - right.id);
}

function itemScopes(items: readonly ShoppingItemRow[]) {
    return items.map((item) => undoScope('shopping_items', { id: item.id }));
}

/** Undo puts the items back as not bought, but keeps the links to the books the purchase created. */
function keepBookLinks(
    snapshot: UndoSnapshot,
    items: readonly ShoppingItemRow[],
): UndoSnapshot {
    return snapshot.map((part) => {
        const item = items.find((candidate) => part.where.id === candidate.id);

        if (part.table !== 'shopping_items' || item === undefined) {
            return part;
        }

        return {
            ...part,
            rows: part.rows.map((row) => ({ ...row, book_id: item.book_id })),
        };
    });
}

function priceSuffix(item: ShoppingItemRow, locale: Locale): string {
    return item.estimated_price_cents === null
        ? ''
        : ` · ${formatMoney(item.estimated_price_cents, locale)}`;
}

function queuePositionOf(
    state: DemoState,
    item: ShoppingItemRow,
): number | null {
    if (item.book_id === null) {
        return null;
    }

    return findQueueItemOfBook(state, item.book_id)?.position ?? null;
}

function titlesOf(items: readonly ShoppingItemRow[]): string {
    return items.map((item) => item.title).join(', ');
}

function filterFrom(query: RouteContext['query']): ShoppingFilter {
    const store = query.get('store') ?? '';
    const sort = query.get('sort') ?? '';

    return {
        store: isStoreType(store) ? store : null,
        search: (query.get('q') ?? '').trim(),
        sort: isShoppingSort(sort) ? sort : null,
    };
}

function withUndo(toast: Toast, token: string): Toast {
    return { ...toast, undo: token };
}

route('GET', SHOPPING_PATH, ({ state, today, query }) => {
    const filter = filterFrom(query);
    const match = (query.get('match') ?? '').trim();

    if (match === '') {
        return render(
            'shopping',
            shoppingPageProps(
                createReadModel(state, today, new Date()),
                filter,
            ),
        );
    }

    return shoppingWithMatches(state, today, filter, match);
});

async function shoppingWithMatches(
    state: DemoState,
    today: string,
    filter: ShoppingFilter,
    match: string,
) {
    const matches = await shoppingMatches(state, match);
    const props = shoppingPageProps(
        createReadModel(state, today, new Date()),
        filter,
    );

    return render('shopping', { ...props, matches });
}

/** ShoppingController::matches: a pasted Amazon link searches by its ISBN, another link finds nothing. */
async function shoppingMatches(
    state: DemoState,
    query: string,
): Promise<ShoppingMatches> {
    const isbn = isbnFromAmazonUrl(query);
    const search = isbn ?? (LINK_PATTERN.test(query) ? '' : query);
    const found = await searchBooks(search, null).catch(() => []);

    return {
        query,
        isbn_from_url: isbn,
        items: candidatePayloads(state, found.slice(0, MATCH_LIMIT)),
    };
}

route('POST', SHOPPING_PATH, ({ state, body, locale }) => {
    const input = shoppingItemInput(body);

    if (input === null) {
        return redirectBack();
    }

    const item = addShoppingItem(state, input, new Date());

    return redirectBack({
        toast: plainSuccessToast(
            translateText(locale, 'Adicionado à lista de compras'),
            item.title,
        ),
    });
});

route(
    'PATCH',
    '/shopping/{shoppingItem}',
    ({ state, body, params, locale }) => {
        const item = itemOfParam(state, params);
        const price = textField(body, 'estimated_price');

        if (
            item === undefined ||
            (price !== '' && parseReais(price) === null)
        ) {
            return redirectBack();
        }

        setShoppingPrice(item, parseReais(price), new Date());

        return redirectBack({
            toast: plainSuccessToast(
                translateText(locale, 'Preço atualizado'),
                item.title,
            ),
        });
    },
);

route('POST', '/shopping/{shoppingItem}/price', ({ state, params, locale }) => {
    const item = itemOfParam(state, params);

    if (item === undefined) {
        return redirectBack();
    }

    if (item.isbn === null) {
        return redirectBack({
            toast: errorToast(
                translateText(locale, 'Sem ISBN não dá para buscar o preço'),
                translateText(locale, 'Anote o preço à mão.'),
            ),
        });
    }

    return redirectBack({
        toast: errorToast(
            translateText(locale, UNAVAILABLE_TITLE),
            translateText(locale, UNAVAILABLE_SUB),
        ),
    });
});

route('DELETE', '/shopping/{shoppingItem}', ({ state, params, locale }) => {
    const item = itemOfParam(state, params);

    if (item === undefined) {
        return redirectBack();
    }

    const snapshot = captureUndo(state, [
        undoScope('shopping_items', { id: item.id }),
    ]);

    deleteShoppingItems(state, new Set([item.id]));

    return redirectBack({
        toast: withUndo(
            successToast(
                translateText(locale, 'Item excluído'),
                `${item.title}${priceSuffix(item, locale)}`,
            ),
            rememberUndo(snapshot),
        ),
    });
});

route('DELETE', SHOPPING_PATH, ({ state, body, locale }) => {
    const items = selectedItems(state, body);

    if (items === undefined) {
        return redirectBack();
    }

    const snapshot = captureUndo(state, itemScopes(items));
    const count = items.length;

    deleteShoppingItems(state, new Set(items.map((item) => item.id)));

    return redirectBack({
        toast: withUndo(
            successToast(
                count === 1
                    ? translateText(locale, 'Item excluído')
                    : translateText(locale, ':count itens excluídos', {
                          count,
                      }),
                titlesOf(items),
            ),
            rememberUndo(snapshot),
        ),
    });
});

route('POST', '/shopping/buy', ({ state, today, body, locale }) => {
    const items = selectedItems(state, body)?.filter(
        (item) => item.bought_at === null,
    );

    if (items === undefined || items.length === 0) {
        return redirectBack();
    }

    const model = createReadModel(state, today, new Date());
    const queue = isQueueOnBuy(model);
    const snapshot = captureUndo(state, [
        ...itemScopes(items),
        undoScope('queue_items'),
    ]);

    for (const item of items) {
        buyShoppingItem(state, item, queue, new Date());
    }

    const count = items.length;
    const destination = queue
        ? translateText(locale, 'em quero ler e na fila')
        : translateText(locale, 'em quero ler');

    return redirectBack({
        toast: withUndo(
            successToast(
                count === 1
                    ? translateText(locale, 'Comprado')
                    : translateText(locale, ':count livros comprados', {
                          count,
                      }),
                `${titlesOf(items)} · ${destination}`,
            ),
            rememberUndo(keepBookLinks(snapshot, items)),
        ),
    });
});

route(
    'POST',
    '/shopping/{shoppingItem}/buy',
    ({ state, today, body, params, locale }) => {
        const item = itemOfParam(state, params);

        if (item === undefined) {
            return redirectBack();
        }

        const model = createReadModel(state, today, new Date());
        const queue =
            'queue' in body ? truthyFlag(body.queue) : isQueueOnBuy(model);
        const snapshot = captureUndo(state, [
            undoScope('shopping_items', { id: item.id }),
            undoScope('queue_items'),
        ]);

        buyShoppingItem(state, item, queue, new Date());

        const position = queuePositionOf(state, item);
        const detail =
            queue && position !== null
                ? translateText(
                      locale,
                      'foi para quero ler e entrou em :position na fila',
                      { position: ordinal(locale, position) },
                  )
                : translateText(locale, 'foi para quero ler');

        return redirectBack({
            toast: withUndo(
                successToast(
                    translateText(locale, 'Comprado'),
                    `${item.title} · ${detail}`,
                ),
                rememberUndo(keepBookLinks(snapshot, [item])),
            ),
        });
    },
);

route(
    'POST',
    '/shopping/{shoppingItem}/unbuy',
    ({ state, today, params, locale }) => {
        const item = itemOfParam(state, params);

        if (item === undefined) {
            return redirectBack();
        }

        const model = createReadModel(state, today, new Date());
        const snapshot = captureUndo(state, [
            undoScope('shopping_items', { id: item.id }),
            undoScope('queue_items'),
        ]);
        const wasQueued = queuePositionOf(state, item) !== null;

        unbuyShoppingItem(state, model, item, new Date());

        const leftQueue = wasQueued && queuePositionOf(state, item) === null;
        const sub = `${item.title}${leftQueue ? ` · ${translateText(locale, 'saiu da fila')}` : ''}`;

        return redirectBack({
            toast: withUndo(
                successToast(
                    translateText(locale, 'Desmarcado como comprado'),
                    sub,
                ),
                rememberUndo(snapshot),
            ),
        });
    },
);

route(
    'PATCH',
    '/shopping/{shoppingItem}/priority',
    ({ state, body, params }) => {
        const item = itemOfParam(state, params);
        const isPriority = flagOrNull(body.is_priority);

        if (item === undefined || isPriority === null) {
            return redirectBack();
        }

        setShoppingPriority(item, isPriority, new Date());
        forgetUndo();

        return redirectBack();
    },
);

route('PUT', '/shopping/preference', ({ state, today, body }) => {
    const queueOnBuy = flagOrNull(body.queue_on_buy);

    if (queueOnBuy === null) {
        return redirectBack();
    }

    setQueueOnBuy(state, queueOnBuy, today);

    return redirectBack();
});

route(
    'POST',
    '/library/{book}/shopping',
    ({ state, today, params, locale }) => {
        const bookId = integerOrNull(params.book);
        const book = state.tables.books.find((row) => row.id === bookId);

        if (book === undefined) {
            return redirectBack();
        }

        const model = createReadModel(state, today, new Date());

        if (!canMoveToShopping(model, book)) {
            return redirectBack({
                toast: errorToast(
                    translateText(
                        locale,
                        ':title não pode ir para as compras',
                        {
                            title: book.title,
                        },
                    ),
                    translateText(
                        locale,
                        'só livros em "quero ler", sem leitura iniciada',
                    ),
                ),
            });
        }

        moveBookToShopping(state, model, book, new Date());

        return redirect(SHOPPING_PATH, {
            toast: plainSuccessToast(
                translateText(locale, ':title foi para as compras', {
                    title: book.title,
                }),
                translateText(locale, 'saiu de "quero ler"'),
            ),
        });
    },
);
