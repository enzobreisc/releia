<?php

namespace App\Models;

use App\Enums\RecommendationStatus;
use Database\Factories\RecommendationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Livro sugerido a partir de um livro que você avaliou bem.
 *
 * @property int $id
 * @property string $title
 * @property string|null $author
 * @property string|null $isbn_13
 * @property string|null $cover_url
 * @property string $reason
 * @property int $based_on_book_id
 * @property RecommendationStatus $status
 * @property Carbon $created_at
 * @property-read Book $basedOn
 */
#[Fillable(['title', 'author', 'isbn_13', 'cover_url', 'reason', 'based_on_book_id', 'status'])]
class Recommendation extends Model
{
    /** @use HasFactory<RecommendationFactory> */
    use HasFactory;

    // A tabela só tem created_at.
    public const UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => RecommendationStatus::class,
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Book, $this>
     */
    public function basedOn(): BelongsTo
    {
        return $this->belongsTo(Book::class, 'based_on_book_id');
    }
}
