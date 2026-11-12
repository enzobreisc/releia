<?php

namespace App\Services\Recommendation;

use App\Enums\RecommendationStatus;
use App\Models\Recommendation;
use App\Models\Setting;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

final class TodaySuggestion
{
    private const TODAY_KEY = 'suggestion-of-day';

    /**
     * Suggestion of the day: the same all day, even if the list changes. Does not hit the network.
     */
    public function pick(): ?Recommendation
    {
        $today = Carbon::today()->toDateString();
        $saved = Setting::get(self::TODAY_KEY);

        $savedId = is_array($saved) && ($saved['date'] ?? null) === $today ? ($saved['id'] ?? null) : null;

        if (is_int($savedId)) {
            $pick = Recommendation::query()
                ->where('status', RecommendationStatus::New)
                ->find($savedId);

            if ($pick !== null) {
                return $pick;
            }
        }

        /** @var Collection<int, Recommendation> $options */
        $options = Recommendation::query()
            ->where('status', RecommendationStatus::New)
            ->orderBy('id')
            ->get();

        if ($options->isEmpty()) {
            return null;
        }

        // crc32 of the date: the choice changes from one day to the next, but not within the same day.
        $pick = $options->get(crc32($today) % $options->count());

        if ($pick !== null) {
            Setting::put(self::TODAY_KEY, ['date' => $today, 'id' => $pick->id]);
        }

        return $pick;
    }
}
