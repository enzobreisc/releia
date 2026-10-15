<?php

namespace App\Models;

use Database\Factories\ReadingSessionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Um trecho lido num dia. Páginas lidas = page_to - page_from + 1.
 *
 * @property int $id
 * @property int $reading_id
 * @property Carbon $read_on
 * @property int $page_from
 * @property int $page_to
 * @property int|null $minutes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Reading $reading
 */
#[Fillable(['read_on', 'page_from', 'page_to', 'minutes'])]
class ReadingSession extends Model
{
    /** @use HasFactory<ReadingSessionFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'read_on' => 'date',
            'page_from' => 'integer',
            'page_to' => 'integer',
            'minutes' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Reading, $this>
     */
    public function reading(): BelongsTo
    {
        return $this->belongsTo(Reading::class);
    }

    public function pages(): int
    {
        return max(0, $this->page_to - $this->page_from + 1);
    }
}
