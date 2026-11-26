import { updateBook, removeBook, type BookInput } from '../domain/book-writes';
import { bookRowOf } from '../domain/rows';
import { createReadModel } from '../domain/read-model';
import { captureUndo, rememberUndo, undoScope } from '../domain/undo';
import { bookPageProps } from '../presenters/book-page';
import { ONLY_IN_APP_PAGE } from '../shell/constants';
import {
    nameList,
    optionalInteger,
    optionalText,
    requiredText,
} from '../support/form-input';
import {
    redirect,
    render,
    route,
    type RouteContext,
    type RouteResult,
} from '../server/router';
import { backWith, refusable, successNotice, translateFor } from './flash';
import { toIsbn13 } from '../support/isbn';

const LIBRARY_PATH = '/library';

function bookIdOf(ctx: RouteContext): number {
    return Number(ctx.params.book);
}

/** UpdateBookRequest::prepareForValidation: an ISBN is kept as its ISBN-13 when it converts. */
function bookInputOf(body: Record<string, unknown>): BookInput {
    const isbn = optionalText(body.isbn_13);

    return {
        title: requiredText(body.title),
        subtitle: optionalText(body.subtitle),
        authors: nameList(body.authors),
        isbn13: isbn === null ? null : (toIsbn13(isbn) ?? isbn),
        publisher: optionalText(body.publisher),
        publishedYear: optionalInteger(body.published_year),
        pages: optionalInteger(body.pages),
        genre: optionalText(body.genre),
        series: optionalText(body.series),
        seriesPosition: optionalInteger(body.series_position),
        description: optionalText(body.description),
    };
}

/** A book the demo does not have shows the same page as any unknown address, instead of failing the render. */
function showAction(ctx: RouteContext): RouteResult {
    const model = createReadModel(ctx.state, ctx.today, new Date());
    const book = model.bookById.get(bookIdOf(ctx));

    if (book === undefined) {
        return render(ONLY_IN_APP_PAGE, {});
    }

    return render('book', bookPageProps(model, book));
}

function updateAction(ctx: RouteContext): RouteResult {
    const { state, body } = ctx;
    const bookId = bookIdOf(ctx);
    const pagesBefore = bookRowOf(state, bookId).pages;
    const snapshot = captureUndo(state, [
        undoScope('books', { id: bookId }),
        undoScope('author_book', { book_id: bookId }, null),
        undoScope('readings', { book_id: bookId }),
    ]);

    updateBook(state, bookId, bookInputOf(body));

    const pagesChanged = pagesBefore !== bookRowOf(state, bookId).pages;
    const sub = pagesChanged
        ? translateFor(state, 'previsão e ritmo recalculados')
        : null;

    return backWith(
        successNotice(translateFor(state, 'Dados atualizados'), sub, {
            undo: rememberUndo(snapshot),
        }),
    );
}

function destroyAction(ctx: RouteContext): RouteResult {
    const { state } = ctx;
    const bookId = bookIdOf(ctx);
    const title = bookRowOf(state, bookId).title;

    removeBook(state, bookId);

    return redirect(LIBRARY_PATH, {
        toast: successNotice(
            translateFor(state, ':title removido', { title }),
            translateFor(state, 'da biblioteca, com leituras, sessões e notas'),
        ),
    });
}

route('GET', '/library/{book}', showAction);
route('PATCH', '/library/{book}', (ctx) => refusable(() => updateAction(ctx)));
route('DELETE', '/library/{book}', (ctx) =>
    refusable(() => destroyAction(ctx)),
);
