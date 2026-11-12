<?php

namespace App\Http\Presenters;

use App\Models\Recommendation;

final class RecommendationPresenter
{
    /**
     * @return array{id: int, title: string, authors: string, cover_url: string|null, reason: string, based_on: string, has_editions: bool}
     */
    public static function card(Recommendation $recommendation): array
    {
        return [
            'id' => $recommendation->id,
            'title' => $recommendation->title,
            'authors' => $recommendation->author ?? '',
            'cover_url' => $recommendation->cover_url,
            'reason' => $recommendation->reason,
            'based_on' => $recommendation->basedOn->title,
            // Older suggestions have no work_key, but an ISBN still lets the editions be found on demand.
            'has_editions' => $recommendation->work_key !== null || $recommendation->isbn_13 !== null,
        ];
    }
}
