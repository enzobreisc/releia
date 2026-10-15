<?php

namespace App\Models;

use App\Enums\ReadingStatus;
use Database\Factories\ReadingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Uma passagem por um livro. Um livro pode ter várias (releitura).
 *
 * @property int $id
 * @property int $book_id
 * @property ReadingStatus $status
 * @property Carbon|null $started_at
 * @property Carbon|null $finished_at
 * @property int $current_page
 * @property int|null $rating
 * @property string|null $review
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Book $book
 * @property-read Collection<int, ReadingSession> $sessions
 */
#[Fillable(['status', 'started_at', 'finished_at', 'current_page', 'rating', 'review'])]
class Reading extends Model
{
    /** @use HasFactory<ReadingFactory> */
    use HasFactory;

    protected $attributes = [
        'current_page' => 0,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ReadingStatus::class,
            'started_at' => 'date',
            'finished_at' => 'date',
            'current_page' => 'integer',
            'rating' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Book, $this>
     */
    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }

    /**
     * @return HasMany<ReadingSession, $this>
     */
    public function sessions(): HasMany
    {
        return $this->hasMany(ReadingSession::class);
    }
}
