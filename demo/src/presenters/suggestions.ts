import type { AiRanking, Suggestion } from '@/types';
import { currentReadingOf } from '../domain/books';
import type { ReadModel } from '../domain/read-model';
import { authorNamesOf } from '../domain/suggestions-identity';
import type { BookCandidate } from '../external/book-candidate';
import { candidateOf } from '../external/book-candidate';
import type { DemoState, RecommendationRow } from '../state/types';
import { toIsbn10 } from '../support/isbn';
import { type CandidatePayload, candidatePayloads } from './candidates';
import { recommendationCard } from './recommendation';

/** The embedding model the app is configured with; the demo never runs it. */
const EMBEDDING_MODEL = 'nomic-embed-text';
const SOURCE_RATINGS: readonly number[] = [4, 5];

type SuggestionsPageProps = {
    query: string;
    results: CandidatePayload[];
    suggestions: Suggestion[];
    hasSources: boolean;
    aiRanking: AiRanking;
    aiAvailability: null;
};

function newSuggestionsNewestFirst(model: ReadModel): RecommendationRow[] {
    return model.state.tables.recommendations
        .filter((recommendation) => recommendation.status === 'new')
        .sort((left, right) => right.id - left.id);
}

/** SourceBooks::exist: a rated book, a book to read or a book to buy is needed to start a search. */
function hasSuggestionSources(model: ReadModel): boolean {
    const { tables } = model.state;
    const hasSourceReading = tables.books.some((book) => {
        const reading = currentReadingOf(model, book.id);

        return (
            reading !== null &&
            (reading.status === 'want_to_read' ||
                (reading.rating !== null &&
                    SOURCE_RATINGS.includes(reading.rating)))
        );
    });

    return (
        hasSourceReading ||
        tables.shopping_items.some((item) => item.bought_at === null)
    );
}

export function suggestionsPageProps(
    model: ReadModel,
    query: string,
    results: CandidatePayload[],
): SuggestionsPageProps {
    return {
        query,
        results,
        suggestions: newSuggestionsNewestFirst(model).map((recommendation) =>
            recommendationCard(model, recommendation),
        ),
        hasSources: hasSuggestionSources(model),
        aiRanking: { enabled: false, model: EMBEDDING_MODEL },
        aiAvailability: null,
    };
}

/** The suggestion's own edition, when the work's editions do not list it. */
function suggestedEdition(recommendation: RecommendationRow): BookCandidate {
    const isbn13 = recommendation.isbn_13;

    return candidateOf({
        title: recommendation.title,
        source: 'open_library',
        isbn13,
        isbn10: isbn13 === null ? null : toIsbn10(isbn13),
        authors: authorNamesOf(recommendation.author),
        coverUrl: recommendation.cover_url,
        workKey: recommendation.work_key,
    });
}

/**
 * The suggested edition comes first, with the suggestion's cover, then the others as the
 * work lists them. Without an ISBN on the suggestion, the work's list is shown as it is.
 */
export function suggestionEditions(
    state: DemoState,
    recommendation: RecommendationRow,
    workEditions: readonly BookCandidate[],
): CandidatePayload[] {
    const isbn13 = recommendation.isbn_13;

    if (isbn13 === null) {
        return candidatePayloads(state, workEditions);
    }

    const listed = workEditions.find((edition) => edition.isbn13 === isbn13);
    const suggested =
        listed === undefined
            ? suggestedEdition(recommendation)
            : {
                  ...listed,
                  coverUrl: recommendation.cover_url ?? listed.coverUrl,
              };
    const others = workEditions.filter((edition) => edition.isbn13 !== isbn13);

    return candidatePayloads(state, [suggested, ...others]);
}
