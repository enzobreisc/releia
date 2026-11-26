import type {
    DemoState,
    ReadingStatus,
    RecommendationRow,
    RecommendationStatus,
} from '../state/types';
import { authorsOf } from './books';
import type { ReadModel } from './read-model';
import { identityKeys, authorNamesOf } from './suggestions-identity';
import { addBook, type NewBook } from './library-writes';
import { toIsbn13 } from '../support/isbn';

function libraryKeys(model: ReadModel): Set<string> {
    return new Set(
        model.state.tables.books.flatMap((book) =>
            identityKeys(
                book.title,
                authorsOf(model, book.id).map((author) => author.name),
                [book.isbn_13, book.isbn_10],
            ),
        ),
    );
}

function suggestionKeys(recommendation: RecommendationRow): string[] {
    return identityKeys(
        recommendation.title,
        authorNamesOf(recommendation.author),
        [recommendation.isbn_13],
    );
}

/** The chosen edition's ISBN, when it is a valid one; null otherwise (the suggestion's edition is used). */
function chosenIsbnOf(chosenIsbn: string | null): string | null {
    return chosenIsbn === null ? null : toIsbn13(chosenIsbn);
}

/** LibraryIntake: a suggestion whose work or chosen edition is already in the library is not added. */
export function canAddSuggestion(
    model: ReadModel,
    recommendation: RecommendationRow,
    chosenIsbn: string | null,
): boolean {
    const inLibrary = libraryKeys(model);
    const isInLibrary = suggestionKeys(recommendation).some((key) =>
        inLibrary.has(key),
    );
    const chosen = chosenIsbnOf(chosenIsbn);
    const edition =
        chosen === null
            ? undefined
            : model.state.tables.books.find((book) => book.isbn_13 === chosen);

    return !isInLibrary && edition === undefined;
}

function newBookFrom(
    recommendation: RecommendationRow,
    status: ReadingStatus,
): NewBook {
    return {
        title: recommendation.title,
        subtitle: null,
        authors: authorNamesOf(recommendation.author),
        isbn13: recommendation.isbn_13,
        publisher: null,
        publishedYear: null,
        pages: null,
        genre: null,
        series: null,
        seriesPosition: null,
        description: null,
        coverUrl: recommendation.cover_url,
        source: 'open_library',
        status,
        finishedOn: null,
        undated: false,
    };
}

/**
 * Creates the book from the suggestion, or from the chosen edition, on the given shelf.
 * The chosen ISBN then becomes the suggestion's, as the app saves it.
 */
export function addSuggestionToLibrary(
    state: DemoState,
    recommendation: RecommendationRow,
    status: ReadingStatus,
    chosenIsbn: string | null,
    now: Date,
): void {
    const chosen = chosenIsbnOf(chosenIsbn);

    if (chosen !== null) {
        recommendation.isbn_13 = chosen;
    }

    addBook(state, newBookFrom(recommendation, status), now);
}

/** Closes the suggestion with the status its answer gives it. */
export function settleSuggestion(
    recommendation: RecommendationRow,
    status: RecommendationStatus,
): void {
    recommendation.status = status;
}
