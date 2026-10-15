<?php

namespace App\Models;

use App\Enums\StoreType;
use Database\Factories\ShoppingItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Livro que você pretende comprar. Ao comprar, vira um livro na biblioteca.
 *
 * @property int $id
 * @property int|null $book_id
 * @property string $title
 * @property string $author
 * @property string|null $isbn
 * @property StoreType $store_type
 * @property int|null $estimated_price_cents
 * @property Carbon|null $bought_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Book|null $book
 */
#[Fillable(['book_id', 'title', 'author', 'isbn', 'store_type', 'estimated_price_cents', 'bought_at'])]
class ShoppingItem extends Model
{
    /** @use HasFactory<ShoppingItemFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'store_type' => StoreType::class,
            'estimated_price_cents' => 'integer',
            'bought_at' => 'datetime',
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
