import { translateText } from '@/lib/i18n';
import {
    addShelf,
    mergeShelves,
    organizeBookcase,
    placeBookOn,
    removeShelf,
    renameShelf,
    setLyingDown,
} from '../domain/bookcase-commands';
import { findBookshelf, isCatchAll } from '../domain/bookcase';
import {
    type MoveInput,
    parseAbsorbedId,
    parseLyingDown,
    parseMoveInput,
    parseOrganizeInput,
    parseShelfName,
    toInteger,
} from '../domain/bookcase-input';
import { parseLibraryFilter } from '../domain/library';
import { createReadModel, type ReadModel } from '../domain/read-model';
import { moveBookInLine } from '../domain/shelf-order';
import { bookcaseSetupProps, libraryProps } from '../presenters/library';
import type { BookRow, BookshelfRow } from '../state/types';
import {
    json,
    redirect,
    redirectBack,
    render,
    route,
    successToast,
    type RouteContext,
    type RouteResult,
} from '../server/router';

const LIBRARY_PATH = '/library';
const UNPROCESSABLE_STATUS = 422;
const NOT_FOUND_STATUS = 404;
const NOT_FOUND_MESSAGE = 'Página não encontrada';

function modelOf(context: RouteContext): ReadModel {
    return createReadModel(context.state, context.today, new Date());
}

function notFound(context: RouteContext): RouteResult {
    return json(
        { message: translateText(context.locale, NOT_FOUND_MESSAGE) },
        NOT_FOUND_STATUS,
    );
}

/** A request the bookcase refuses outright, such as removing the catch-all shelf. */
function unprocessable(): RouteResult {
    return json({}, UNPROCESSABLE_STATUS);
}

function bookshelfParam(context: RouteContext): BookshelfRow | undefined {
    const id = toInteger(context.params.bookshelf);

    return id === null ? undefined : findBookshelf(context.state.tables, id);
}

function bookParam(
    context: RouteContext,
    model: ReadModel,
): BookRow | undefined {
    const id = toInteger(context.params.book);

    return id === null ? undefined : model.bookById.get(id);
}

function libraryIndex(context: RouteContext): RouteResult {
    return render(
        'library',
        libraryProps(modelOf(context), parseLibraryFilter(context.query)),
    );
}

function bookcaseSetupPage(context: RouteContext): RouteResult {
    return render('bookcase-setup', bookcaseSetupProps(modelOf(context)));
}

function organizeHandler(context: RouteContext): RouteResult {
    const input = parseOrganizeInput(context.body);

    if (input === null) {
        return redirectBack();
    }

    organizeBookcase(modelOf(context), input, new Date());

    return redirect(LIBRARY_PATH, {
        toast: successToast(translateText(context.locale, 'Estante montada')),
    });
}

function storeShelf(context: RouteContext): RouteResult {
    const name = parseShelfName(context.body);

    if (name === null) {
        return redirectBack();
    }

    addShelf(context.state.tables, name, new Date());

    return redirectBack();
}

function updateShelf(context: RouteContext): RouteResult {
    const shelf = bookshelfParam(context);

    if (shelf === undefined) {
        return notFound(context);
    }

    const name = parseShelfName(context.body);

    if (name === null) {
        return redirectBack();
    }

    renameShelf(shelf, name, new Date());

    return redirectBack();
}

function absorbedShelfOf(
    context: RouteContext,
    kept: BookshelfRow,
): BookshelfRow | undefined {
    const absorbedId = parseAbsorbedId(context.body);

    if (absorbedId === null || absorbedId === kept.id) {
        return undefined;
    }

    return findBookshelf(context.state.tables, absorbedId);
}

function mergeShelfHandler(context: RouteContext): RouteResult {
    const kept = bookshelfParam(context);

    if (kept === undefined) {
        return notFound(context);
    }

    const absorbed = absorbedShelfOf(context, kept);

    if (absorbed === undefined) {
        return redirectBack();
    }

    if (isCatchAll(kept) || isCatchAll(absorbed)) {
        return unprocessable();
    }

    mergeShelves(context.state.tables, kept, absorbed, new Date());

    return redirectBack({
        toast: successToast(
            translateText(context.locale, 'Prateleiras unidas'),
            kept.name,
        ),
    });
}

function deleteShelf(context: RouteContext): RouteResult {
    const shelf = bookshelfParam(context);

    if (shelf === undefined) {
        return notFound(context);
    }

    if (isCatchAll(shelf)) {
        return unprocessable();
    }

    removeShelf(context.state.tables, shelf);

    return redirectBack({
        toast: successToast(
            translateText(context.locale, 'Prateleira apagada'),
            shelf.name,
        ),
    });
}

/** The book a move drops before, and the shelf it lands on, must both exist. */
function isKnownMoveTarget(model: ReadModel, input: MoveInput): boolean {
    const { beforeBookId, placement } = input;
    const bookExists =
        beforeBookId === null || model.bookById.has(beforeBookId);
    const shelfExists =
        placement === null ||
        placement.bookshelfId === null ||
        findBookshelf(model.state.tables, placement.bookshelfId) !== undefined;

    return bookExists && shelfExists;
}

function moveBookHandler(context: RouteContext): RouteResult {
    const model = modelOf(context);
    const book = bookParam(context, model);

    if (book === undefined) {
        return notFound(context);
    }

    const input = parseMoveInput(context.body);

    if (input === null || !isKnownMoveTarget(model, input)) {
        return redirectBack();
    }

    moveBookInLine(model, book.id, input.beforeBookId);

    if (input.placement !== null) {
        placeBookOn(book, input.placement.bookshelfId);
    }

    return redirectBack();
}

function updatePostureHandler(context: RouteContext): RouteResult {
    const book = bookParam(context, modelOf(context));

    if (book === undefined) {
        return notFound(context);
    }

    const isLyingDown = parseLyingDown(context.body);

    if (isLyingDown === null) {
        return redirectBack();
    }

    setLyingDown(book, isLyingDown);

    return redirectBack();
}

route('GET', LIBRARY_PATH, libraryIndex);
route('GET', '/library/bookcase/setup', bookcaseSetupPage);
route('POST', '/library/bookcase/setup', organizeHandler);
route('POST', '/bookshelves', storeShelf);
route('PATCH', '/bookshelves/{bookshelf}', updateShelf);
route('POST', '/bookshelves/{bookshelf}/merge', mergeShelfHandler);
route('DELETE', '/bookshelves/{bookshelf}', deleteShelf);
route('PATCH', '/library/{book}/position', moveBookHandler);
route('PATCH', '/library/{book}/posture', updatePostureHandler);
