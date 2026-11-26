import {
    givenNamesFirst,
    normalizeText,
    normalizeTitle,
} from './authors-identity';
import { toIsbn13 } from '../support/isbn';

const ISBN_KEY_PREFIX = 'isbn:';
const TITLE_AUTHOR_KEY_PREFIX = 'title-author:';

/** AuthorNames::split: the comma-separated authors of a suggestion or a book. */
export function authorNamesOf(author: string | null): string[] {
    return author === null || author.trim() === ''
        ? []
        : author.split(',').map((name) => name.trim());
}

/** BookIdentity::keys: the ISBNs and the title with the first author, so one book has one key per source. */
export function identityKeys(
    title: string,
    authors: readonly string[],
    isbns: readonly (string | null)[],
): string[] {
    const isbnKeys = isbns
        .filter((isbn): isbn is string => isbn !== null && isbn !== '')
        .map((isbn) => `${ISBN_KEY_PREFIX}${toIsbn13(isbn) ?? isbn}`);
    const author = normalizeText(givenNamesFirst(authors[0] ?? ''));

    return [
        ...isbnKeys,
        `${TITLE_AUTHOR_KEY_PREFIX}${normalizeTitle(title)}|${author}`,
    ];
}
