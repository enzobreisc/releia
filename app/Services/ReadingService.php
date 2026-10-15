<?php

namespace App\Services;

use App\Enums\ReadingStatus;
use App\Models\Reading;
use Illuminate\Support\Carbon;

/**
 * Regras da leitura: as datas de início e fim acompanham a estante,
 * porque as estatísticas contam livros lidos pela data de fim.
 */
class ReadingService
{
    public function changeStatus(Reading $reading, ReadingStatus $status): void
    {
        if ($reading->status === $status && $reading->exists) {
            return;
        }

        $today = Carbon::today();
        $reading->status = $status;

        switch ($status) {
            case ReadingStatus::QueroLer:
                $reading->started_at = null;
                $reading->finished_at = null;
                break;

            case ReadingStatus::Lendo:
                $reading->started_at ??= $today;
                $reading->finished_at = null;
                break;

            case ReadingStatus::Lido:
                $reading->started_at ??= $today;
                $reading->finished_at = $today;
                $reading->current_page = max($reading->current_page, $reading->book->pages ?? 0);
                break;

            case ReadingStatus::Abandonado:
                $reading->started_at ??= $today;
                $reading->finished_at = $today;
                break;
        }

        $reading->save();
    }
}
