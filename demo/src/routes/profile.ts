import { translateText } from '@/lib/i18n';
import { bookOf } from '../domain/books';
import { MAX_PINS, PINS_SETTING } from '../domain/profile-reads';
import {
    canPin,
    pinBook,
    readReaderInput,
    saveReader,
    unpinBook,
} from '../domain/profile-writes';
import { createReadModel } from '../domain/read-model';
import {
    captureUndo,
    forgetUndo,
    rememberUndo,
    undoScope,
} from '../domain/undo';
import { profileProps } from '../presenters/profile';
import {
    errorToast,
    json,
    redirectBack,
    render,
    route,
    successToast,
} from '../server/router';
import { integerOrNull } from './route-input';

const NOT_FOUND_TEXT = 'Página não encontrada';

route('GET', '/profile', ({ state, query, today }) => {
    const model = createReadModel(state, today, new Date());

    return render('profile', profileProps(model, query.get('year')));
});

route('PUT', '/profile', ({ state, body, today, locale }) => {
    const input = readReaderInput(body);

    if (input === null) {
        return redirectBack();
    }

    forgetUndo();
    saveReader(createReadModel(state, today, new Date()), input);

    return redirectBack({
        toast: successToast(translateText(locale, 'Perfil salvo')),
    });
});

route('POST', '/profile/pins', ({ state, body, today, locale }) => {
    const model = createReadModel(state, today, new Date());
    const bookId = integerOrNull(body.book_id);

    if (bookId === null || !model.bookById.has(bookId)) {
        return redirectBack();
    }

    if (!canPin(model, bookId)) {
        return redirectBack({
            toast: errorToast(
                translateText(locale, 'Você pode fixar até :max livros.', {
                    max: MAX_PINS,
                }),
            ),
        });
    }

    forgetUndo();
    pinBook(model, bookId);

    return redirectBack({
        toast: successToast(
            translateText(locale, 'Fixado no perfil'),
            bookOf(model, bookId).title,
        ),
    });
});

route('DELETE', '/profile/pins/{book}', ({ state, params, today, locale }) => {
    const model = createReadModel(state, today, new Date());
    const bookId = integerOrNull(params.book);

    if (bookId === null || !model.bookById.has(bookId)) {
        return json({ message: translateText(locale, NOT_FOUND_TEXT) }, 404);
    }

    const snapshot = captureUndo(state, [
        undoScope('settings', { key: PINS_SETTING }, null),
    ]);
    const title = bookOf(model, bookId).title;

    unpinBook(model, bookId);

    return redirectBack({
        toast: {
            ...successToast(translateText(locale, 'Desafixado'), title),
            undo: rememberUndo(snapshot),
        },
    });
});
