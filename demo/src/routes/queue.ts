import { ordinal, translateText } from '@/lib/i18n';
import type { Toast } from '@/types';
import {
    addToQueue,
    findQueueItemOfBook,
    isQueueOrder,
    removeQueueItem,
    reorderQueue,
    startRereadWantToRead,
} from '../domain/queue-writes';
import { currentReadingOf } from '../domain/books';
import { createReadModel } from '../domain/read-model';
import { pendingShoppingCount } from '../domain/shopping';
import { captureUndo, rememberUndo, undoScope } from '../domain/undo';
import { queuePageProps } from '../presenters/queue-page';
import {
    errorToast,
    redirectBack,
    render,
    route,
    successToast,
    type RedirectResult,
    type RouteContext,
} from '../server/router';
import type { BookRow, DemoState, QueueItemRow } from '../state/types';
import { idsFromBody, integerOrNull } from './route-input';

const QUEUE_PATH = '/queue';

type RouteParams = RouteContext['params'];

function findBook(state: DemoState, value: unknown): BookRow | undefined {
    const bookId = integerOrNull(value);

    return state.tables.books.find((book) => book.id === bookId);
}

function queueItemOfParam(state: DemoState, params: RouteParams) {
    const queueItemId = integerOrNull(params.queueItem);

    return state.tables.queue_items.find((item) => item.id === queueItemId);
}

/** Removes the entry from the queue and tells the reader what it was, with undo. */
function removeFromQueue(
    context: RouteContext,
    item: QueueItemRow,
): RedirectResult {
    const { state, locale } = context;
    const snapshot = captureUndo(state, [undoScope('queue_items')]);
    const title = findBook(state, item.book_id)?.title ?? '';
    const sub = `${title} · ${translateText(locale, 'era o :position', { position: ordinal(locale, item.position) })}`;

    removeQueueItem(state, item.id);

    return redirectBack({
        toast: {
            ...successToast(translateText(locale, 'Tirado da fila'), sub),
            undo: rememberUndo(snapshot),
        },
    });
}

function addedToQueueToast(
    context: RouteContext,
    title: string,
    position: number,
    undoToken: string,
): Toast {
    const { locale, currentPath } = context;
    const sub = `${title} · ${translateText(locale, 'entrou em :position', { position: ordinal(locale, position) })}`;
    const isOnQueuePage = currentPath.includes(QUEUE_PATH);

    return {
        ...successToast(translateText(locale, 'Adicionado à fila'), sub),
        action: isOnQueuePage
            ? null
            : {
                  label: translateText(locale, 'Ver fila'),
                  method: 'get',
                  url: QUEUE_PATH,
              },
        undo: undoToken,
    };
}

route('GET', QUEUE_PATH, ({ state, today }) => {
    const model = createReadModel(state, today, new Date());

    return render('queue', queuePageProps(model, pendingShoppingCount(state)));
});

route('POST', '/queue/books', (context) => {
    const { state, today, body } = context;
    const book = findBook(state, body.book_id);

    if (book === undefined) {
        return redirectBack();
    }

    const now = new Date();
    const isReread =
        currentReadingOf(createReadModel(state, today, now), book.id)
            ?.status === 'read';
    const snapshot = captureUndo(state, [
        undoScope('readings', { book_id: book.id }),
        undoScope('queue_items'),
    ]);

    if (isReread) {
        startRereadWantToRead(state, book.id, now);
    } else {
        addToQueue(state, book.id, now);
    }

    const position = findQueueItemOfBook(state, book.id)?.position ?? 0;

    return redirectBack({
        toast: addedToQueueToast(
            context,
            book.title,
            position,
            rememberUndo(snapshot),
        ),
    });
});

route('PATCH', '/queue/order', ({ state, body, locale }) => {
    const ids = idsFromBody(body.ids);

    if (ids === null) {
        return redirectBack();
    }

    if (!isQueueOrder(state, ids)) {
        return redirectBack({
            toast: errorToast(
                translateText(
                    locale,
                    'A fila mudou. Atualize a página e tente de novo.',
                ),
            ),
        });
    }

    reorderQueue(state, ids);

    return redirectBack();
});

route('DELETE', '/queue/books/{book}', (context) => {
    const { state, params } = context;
    const book = findBook(state, params.book);
    const item = state.tables.queue_items.find(
        (queueItem) => queueItem.book_id === book?.id,
    );

    return item === undefined ? redirectBack() : removeFromQueue(context, item);
});

route('DELETE', '/queue/{queueItem}', (context) => {
    const item = queueItemOfParam(context.state, context.params);

    return item === undefined ? redirectBack() : removeFromQueue(context, item);
});
