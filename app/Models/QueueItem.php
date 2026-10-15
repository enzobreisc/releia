<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Um livro na fila de próximas leituras. A ordem é a coluna position (1..n).
 *
 * @property int $id
 * @property int $book_id
 * @property int $position
 * @property Carbon $added_at
 * @property-read Book $book
 */
#[Fillable(['book_id', 'position', 'added_at'])]
class QueueItem extends Model
{
    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'book_id' => 'integer',
            'position' => 'integer',
            'added_at' => 'datetime',
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
