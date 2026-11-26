import { translateText } from '@/lib/i18n';
import { authorOf, booksOfAuthor, booksOfSameAuthor } from '../domain/authors';
import { createReadModel, type ReadModel } from '../domain/read-model';
import type { AuthorRow } from '../state/types';
import { loadAuthorPhotoUrl, loadAuthorWorks } from '../external/author-works';
import { authorPageProps, authorsIndexProps } from '../presenters/authors';
import {
    json,
    render,
    route,
    type RouteContext,
    type RouteResult,
} from '../server/router';

const NOT_FOUND_MESSAGE = 'Página não encontrada';

type ResolvedAuthor = { model: ReadModel; author: AuthorRow };

function resolveAuthor(context: RouteContext): ResolvedAuthor | null {
    const model = createReadModel(context.state, context.today, new Date());
    const author = authorOf(model, Number(context.params.author));

    return author === null ? null : { model, author };
}

function notFound(context: RouteContext): RouteResult {
    return json(
        { message: translateText(context.locale, NOT_FOUND_MESSAGE) },
        404,
    );
}

route('GET', '/authors', ({ state, today }) =>
    render(
        'authors',
        authorsIndexProps(createReadModel(state, today, new Date())),
    ),
);

route('GET', '/authors/{author}', (context) => {
    const resolved = resolveAuthor(context);

    if (resolved === null) {
        return notFound(context);
    }

    return render('author', authorPageProps(resolved.model, resolved.author));
});

route('GET', '/authors/{author}/works', async (context) => {
    const resolved = resolveAuthor(context);

    if (resolved === null) {
        return notFound(context);
    }

    const { model, author } = resolved;

    return json(
        await loadAuthorWorks(
            author,
            booksOfAuthor(model, author.id),
            booksOfSameAuthor(model, author),
        ),
    );
});

route('GET', '/authors/{author}/look-up-photo', async (context) => {
    const resolved = resolveAuthor(context);

    if (resolved === null) {
        return notFound(context);
    }

    const { model, author } = resolved;

    return json({
        photo_url: await loadAuthorPhotoUrl(
            author,
            booksOfAuthor(model, author.id),
        ),
    });
});
