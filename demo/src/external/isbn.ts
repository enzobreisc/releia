import { genreFromSubjects } from '../support/genres';
import { isBrazilianIsbn, toIsbn10 } from '../support/isbn';
import {
    type BookCandidate,
    candidateOf,
    positiveIntOf,
    textOf,
    uniqueAuthors,
    yearOf,
} from './book-candidate';
import { recordOf, stringsOf } from '../support/json-fields';
import { requestJson } from './json-request';

const BRASIL_API_ISBN = 'https://brasilapi.com.br/api/isbn/v1';
const FIRST_AUTHOR_ONLY = 1;

/**
 * The first name of the list is the author; the others are often translators, illustrators or
 * publishers, which BrasilAPI does not tell apart, so they are left out.
 */
function firstAuthorOf(book: Record<string, unknown>): string[] {
    return uniqueAuthors(Array.isArray(book.authors) ? book.authors : []).slice(
        0,
        FIRST_AUTHOR_ONLY,
    );
}

/** Brazilian ISBNs only: BrasilAPI knows the local publishers that the other sources miss. */
export async function findInBrasilApi(
    isbn13: string,
    timeoutMs: number,
): Promise<BookCandidate | null> {
    if (!isBrazilianIsbn(isbn13)) {
        return null;
    }

    const answer = await requestJson(`${BRASIL_API_ISBN}/${isbn13}`, timeoutMs);
    const book = answer?.status === 200 ? recordOf(answer.body) : null;
    const title = textOf(book?.title);

    if (book === null || title === null) {
        return null;
    }

    return candidateOf({
        title,
        source: 'brasil_api',
        isbn13,
        isbn10: toIsbn10(isbn13),
        subtitle: textOf(book.subtitle),
        authors: firstAuthorOf(book),
        publisher: textOf(book.publisher),
        publishedYear: yearOf(book.year),
        pages: positiveIntOf(book.page_count),
        genre: genreFromSubjects(stringsOf(book.subjects)),
        description: textOf(book.synopsis),
        coverUrl: textOf(book.cover_url),
    });
}
