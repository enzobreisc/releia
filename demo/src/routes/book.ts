import { createReadModel } from '../domain/read-model';
import { updateBook, removeBook, type BookInput } from '../domain/book-writes';
import { bookRowOf } from '../domain/rows';
import { captureUndo, rememberUndo, undoScope } from '../domain/undo';
import { bookPageProps } from '../presenters/book-page';
import { ONLY_IN_APP_PAGE } from '../shell/constants';
import { nameList, optionalText, requiredText } from '../support/form-input';
import {
    FormErrors,
    checkMaxLength,
    wholeNumberField,
    type NumberRange,
} from '../support/form-errors';
import { yearOf } from '../support/day';
import {
    redirect,
    render,
    route,
    type RouteContext,
    type RouteResult,
} from '../server/router';
import {
    backWith,
    formRefusable,
    refusable,
    successNotice,
    translateFor,
} from './flash';
import { toIsbn13 } from '../support/isbn';
import { isHttpUrl } from '../support/http-url';

const LIBRARY_PATH = '/library';
const MAX_SHORT_TEXT = 255;
const MAX_DESCRIPTION = 20_000;
const MAX_URL = 2048;
const PAGES_RANGE: NumberRange = { min: 1, max: 20_000 };
const SERIES_POSITION_RANGE: NumberRange = { min: 1, max: 999 };
const FIRST_PUBLISHED_YEAR = 1450;

function bookIdOf(ctx: RouteContext): number {
    return Number(ctx.params.book);
}

/** UpdateBookRequest: the form's text and numbers, each checked against its rule. */
function bookInputOf(
    body: Record<string, unknown>,
    errors: FormErrors,
    today: string,
): BookInput {
    const isbn = optionalText(body.isbn_13);
    const title = requiredText(body.title);
    const subtitle = optionalText(body.subtitle);
    const publisher = optionalText(body.publisher);
    const genre = optionalText(body.genre);
    const series = optionalText(body.series);
    const description = optionalText(body.description);
    const coverUrl = optionalText(body.cover_url);

    checkMaxLength(
        errors,
        'title',
        title,
        MAX_SHORT_TEXT,
        'O campo título deve ter no máximo :max caracteres.',
    );
    checkMaxLength(
        errors,
        'subtitle',
        subtitle,
        MAX_SHORT_TEXT,
        'O campo subtítulo deve ter no máximo :max caracteres.',
    );
    checkMaxLength(
        errors,
        'publisher',
        publisher,
        MAX_SHORT_TEXT,
        'O campo editora deve ter no máximo :max caracteres.',
    );
    checkMaxLength(
        errors,
        'genre',
        genre,
        MAX_SHORT_TEXT,
        'O campo gênero deve ter no máximo :max caracteres.',
    );
    checkMaxLength(
        errors,
        'series',
        series,
        MAX_SHORT_TEXT,
        'O campo series deve ter no máximo :max caracteres.',
    );
    checkMaxLength(
        errors,
        'description',
        description,
        MAX_DESCRIPTION,
        'O campo descrição deve ter no máximo :max caracteres.',
    );

    if (coverUrl !== null && !isHttpUrl(coverUrl)) {
        errors.add('cover_url', 'O campo capa deve ser um link válido.');
    }

    checkMaxLength(
        errors,
        'cover_url',
        coverUrl,
        MAX_URL,
        'O campo capa deve ter no máximo :max caracteres.',
    );

    const lastYear = yearOf(today) + 1;

    return {
        title,
        subtitle,
        authors: nameList(body.authors),
        isbn13: isbn === null ? null : (toIsbn13(isbn) ?? isbn),
        publisher,
        publishedYear: wholeNumberField(
            errors,
            'published_year',
            body.published_year,
            { min: FIRST_PUBLISHED_YEAR, max: lastYear },
            'Use um ano entre 1450 e :year.',
            { year: lastYear },
        ),
        pages: wholeNumberField(
            errors,
            'pages',
            body.pages,
            PAGES_RANGE,
            'Número de páginas inválido.',
        ),
        genre,
        series,
        seriesPosition: wholeNumberField(
            errors,
            'series_position',
            body.series_position,
            SERIES_POSITION_RANGE,
            'Volume inválido.',
        ),
        description,
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
    const { state, body, today } = ctx;
    const bookId = bookIdOf(ctx);
    const pagesBefore = bookRowOf(state, bookId).pages;
    const errors = new FormErrors(state.runtime.locale);
    const input = bookInputOf(body, errors, today);

    errors.throwIfAny();

    const snapshot = captureUndo(state, [
        undoScope('books', { id: bookId }),
        undoScope('author_book', { book_id: bookId }, null),
        undoScope('readings', { book_id: bookId }),
    ]);

    updateBook(state, bookId, input);

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
route('PATCH', '/library/{book}', (ctx) =>
    formRefusable(() => updateAction(ctx)),
);
route('DELETE', '/library/{book}', (ctx) =>
    refusable(() => destroyAction(ctx)),
);
