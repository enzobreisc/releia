import { translateText } from '@/lib/i18n';
import { type BookCandidate } from '../external/book-candidate';
import {
    editionsOfWork,
    findBookByIsbn,
    searchBooks,
} from '../external/book-search';
import { workKeyOf } from '../external/open-library-keys';
import { addBook } from '../domain/library-writes';
import { orderEditions } from '../domain/editions';
import { newBookInput, READING_STATUSES } from '../domain/new-book-input';
import { candidatePayloads } from '../presenters/candidates';
import { isAmazonUrl } from '../support/amazon-link';
import { genreNames } from '../support/genres';
import { readingStatusLabel } from '../support/labels';
import { toIsbn13 } from '../support/isbn';
import {
    errorToast,
    json,
    redirect,
    redirectBack,
    render,
    route,
    type RouteContext,
    type RouteResult,
    successToast,
} from '../server/router';

const ADD_BOOK_PAGE = 'add-book';
const BOOK_ADDED_TITLE = 'Livro adicionado';
const COVER_LINK_HINT =
    'Cole o link da página do produto na Amazon (o que tem /dp/ no endereço).';
/** The demo cannot read Amazon pages from the browser, so a valid link gets the app's "no cover" answer. */
const NO_AMAZON_COVER = 'A Amazon não tem capa para esse produto.';
const AMAZON_PRODUCT_PATH =
    /\/(?:dp|gp\/product|o\/ASIN)\/([0-9A-Z]{10})(?:[/?]|$)/i;

type AddBookLookup = {
    query: string;
    publisher: string;
    work: string | null;
    isbn: string | null;
};

type FoundBooks = {
    results: BookCandidate[];
    editions: { workKey: string; items: BookCandidate[] } | null;
    preview: BookCandidate | null;
};

const NOTHING_FOUND: FoundBooks = {
    results: [],
    editions: null,
    preview: null,
};

function lookupOf(params: URLSearchParams): AddBookLookup {
    return {
        query: (params.get('q') ?? '').trim(),
        publisher: (params.get('publisher') ?? '').trim(),
        work: workKeyOf(`/works/${params.get('work') ?? ''}`),
        isbn: toIsbn13((params.get('isbn') ?? '').trim()),
    };
}

function needsNetwork(lookup: AddBookLookup): boolean {
    return lookup.query !== '' || lookup.work !== null || lookup.isbn !== null;
}

async function lookUpBooks(lookup: AddBookLookup): Promise<FoundBooks> {
    const [results, editions, preview] = await Promise.all([
        lookup.query === '' ? [] : searchBooks(lookup.query, lookup.publisher),
        lookup.work === null ? null : editionsOfWork(lookup.work),
        lookup.isbn === null ? null : findBookByIsbn(lookup.isbn),
    ]);

    return {
        results,
        editions:
            lookup.work === null || editions === null
                ? null
                : { workKey: lookup.work, items: editions },
        preview,
    };
}

function statusOptions(
    context: RouteContext,
): { value: string; label: string }[] {
    return READING_STATUSES.map((value) => ({
        value,
        label: readingStatusLabel(context.locale, value),
    }));
}

function addBookPage(
    context: RouteContext,
    lookup: AddBookLookup,
    found: FoundBooks,
): RouteResult {
    const { state } = context;
    const publisher = lookup.publisher === '' ? null : lookup.publisher;
    const editions =
        found.editions === null
            ? null
            : {
                  work_key: found.editions.workKey,
                  items: candidatePayloads(
                      state,
                      orderEditions(state, found.editions.items, publisher),
                  ),
              };
    const preview = candidatePayloads(
        state,
        found.preview === null ? [] : [found.preview],
    )[0];

    return render(ADD_BOOK_PAGE, {
        query: lookup.query,
        publisher: lookup.publisher,
        results: candidatePayloads(state, found.results),
        editions,
        preview: preview ?? null,
        statuses: statusOptions(context),
        genres: genreNames(),
    });
}

route('GET', '/library/add', (context) => {
    const lookup = lookupOf(context.query);

    if (!needsNetwork(lookup)) {
        return addBookPage(context, lookup, NOTHING_FOUND);
    }

    return lookUpBooks(lookup).then((found) =>
        addBookPage(context, lookup, found),
    );
});

route('POST', '/library', (context) => {
    const parsed = newBookInput(context.body, context.state, context.today);

    if (!parsed.ok) {
        return redirectBack({
            toast: errorToast(translateText(context.locale, parsed.message)),
        });
    }

    const book = addBook(context.state, parsed.book, new Date());
    const status = readingStatusLabel(context.locale, parsed.book.status);
    const sub = `${book.title} · ${status.toLowerCase()}`;

    return redirect(`/library/${book.id}`, {
        toast: successToast(
            translateText(context.locale, BOOK_ADDED_TITLE),
            sub,
        ),
    });
});

function asinOf(link: string): string | null {
    if (!isAmazonUrl(link)) {
        return null;
    }

    const asin = AMAZON_PRODUCT_PATH.exec(new URL(link).pathname)?.[1];

    return asin === undefined ? null : asin.toUpperCase();
}

route('GET', '/library/amazon-cover', (context) => {
    const link = (context.query.get('url') ?? '').trim();
    const message = asinOf(link) === null ? COVER_LINK_HINT : NO_AMAZON_COVER;

    return json({ message: translateText(context.locale, message) }, 422);
});
