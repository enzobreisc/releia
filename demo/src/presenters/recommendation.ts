import type { Suggestion } from '@/types';
import type { RecommendationRow } from '../state/types';
import type { ReadModel } from '../domain/read-model';

/** RecommendationPresenter::card; the based-on title comes from the library. */
export function recommendationCard(
    model: ReadModel,
    recommendation: RecommendationRow,
): Suggestion {
    const basedOn =
        recommendation.based_on_book_id === null
            ? undefined
            : model.bookById.get(recommendation.based_on_book_id);

    return {
        id: recommendation.id,
        title: recommendation.title,
        authors: recommendation.author ?? '',
        cover_url: recommendation.cover_url,
        reason: recommendation.reason,
        based_on: basedOn?.title ?? null,
        has_editions:
            recommendation.work_key !== null || recommendation.isbn_13 !== null,
    };
}
