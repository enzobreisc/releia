import type { RecommendationRow } from '../state/types';
import { crc32 } from '../support/crc32';
import type { ReadModel } from './read-model';
import { readSetting, writeSetting } from './settings';

const SUGGESTION_OF_DAY_SETTING = 'suggestion-of-day';

type SavedPick = { date: string; id: number };

function isSavedPick(value: unknown): value is SavedPick {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const { date, id } = value as Record<string, unknown>;

    return (
        typeof date === 'string' &&
        typeof id === 'number' &&
        Number.isInteger(id)
    );
}

function newSuggestions(model: ReadModel): RecommendationRow[] {
    return model.state.tables.recommendations
        .filter((recommendation) => recommendation.status === 'new')
        .sort((left, right) => left.id - right.id);
}

function savedSuggestion(model: ReadModel): RecommendationRow | null {
    const saved = readSetting(model, SUGGESTION_OF_DAY_SETTING);

    if (!isSavedPick(saved) || saved.date !== model.today) {
        return null;
    }

    return (
        newSuggestions(model).find(
            (recommendation) => recommendation.id === saved.id,
        ) ?? null
    );
}

/**
 * TodaySuggestion::pick: the same suggestion all day, even if the list changes. Like the
 * app, the choice is saved as a setting, so the write is part of the pick.
 */
export function pickSuggestionOfDay(
    model: ReadModel,
): RecommendationRow | null {
    const kept = savedSuggestion(model);

    if (kept !== null) {
        return kept;
    }

    const options = newSuggestions(model);

    if (options.length === 0) {
        return null;
    }

    const pick = options[crc32(model.today) % options.length] ?? null;

    if (pick !== null) {
        writeSetting(
            model.state,
            SUGGESTION_OF_DAY_SETTING,
            { date: model.today, id: pick.id },
            model.today,
        );
    }

    return pick;
}
