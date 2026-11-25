<?php

namespace App\Models;

use App\Casts\PackedVector;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $book_id
 * @property string $model
 * @property list<float> $vector
 * @property string $source_hash
 * @property-read Book $book
 */
#[Fillable(['book_id', 'model', 'vector', 'source_hash'])]
class BookEmbedding extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'vector' => PackedVector::class,
        ];
    }

    /**
     * @return BelongsTo<Book, $this>
     */
    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }
}
