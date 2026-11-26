import type { BookCandidate } from '../external/book-candidate';
import type { DemoState } from '../state/types';

/** BookPresenter::candidate: the candidate as the page reads it, with the library book it matches. */
export type CandidatePayload = {
    isbn_13: string | null;
    isbn_10: string | null;
    title: string;
    subtitle: string | null;
    authors: string[];
    publisher: string | null;
    published_year: number | null;
    pages: number | null;
    genre: string | null;
    description: string | null;
    cover_url: string | null;
    source: string;
    work_key: string | null;
    edition_count: number | null;
    language: string | null;
    popularity: number | null;
    brazilian_isbns: string[];
    library_id: number | null;
};

/** Library book ids by ISBN; with repeated ISBNs the last book wins, as the query's pluck does. */
function libraryIdsByIsbn(state: DemoState): Map<string, number> {
    const ids = new Map<string, number>();

    for (const book of state.tables.books) {
        if (book.isbn_13 !== null) {
            ids.set(book.isbn_13, book.id);
        }
    }

    return ids;
}

function payloadOf(
    candidate: BookCandidate,
    libraryIds: ReadonlyMap<string, number>,
): CandidatePayload {
    return {
        isbn_13: candidate.isbn13,
        isbn_10: candidate.isbn10,
        title: candidate.title,
        subtitle: candidate.subtitle,
        authors: candidate.authors,
        publisher: candidate.publisher,
        published_year: candidate.publishedYear,
        pages: candidate.pages,
        genre: candidate.genre,
        description: candidate.description,
        cover_url: candidate.coverUrl,
        source: candidate.source,
        work_key: candidate.workKey,
        edition_count: candidate.editionCount,
        language: candidate.language,
        popularity: candidate.popularity,
        brazilian_isbns: candidate.brazilianIsbns,
        library_id:
            candidate.isbn13 === null
                ? null
                : (libraryIds.get(candidate.isbn13) ?? null),
    };
}

/** BookPresenter::candidates: every candidate, each matched with the library by its ISBN. */
export function candidatePayloads(
    state: DemoState,
    candidates: readonly BookCandidate[],
): CandidatePayload[] {
    const libraryIds = libraryIdsByIsbn(state);

    return candidates.map((candidate) => payloadOf(candidate, libraryIds));
}
