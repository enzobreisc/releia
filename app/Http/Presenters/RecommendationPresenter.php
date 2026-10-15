<?php

namespace App\Http\Presenters;

use App\Models\Recommendation;

/** Formato das sugestões enviado às páginas. */
final class RecommendationPresenter
{
    /**
     * @return array{id: int, title: string, authors: string, cover_url: string|null, reason: string, based_on: string}
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
        ];
    }
}
