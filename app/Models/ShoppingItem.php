<?php

namespace App\Models;

use App\Enums\StoreType;
use App\Support\AmazonLink;
use App\Support\StoreLinks;
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
 * @property string|null $cover_url
 * @property string|null $cover_path
 * @property string|null $url
 * @property StoreType $store_type
 * @property int|null $estimated_price_cents
 * @property Carbon|null $price_checked_at
 * @property Carbon|null $bought_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Book|null $book
 */
#[Fillable(['book_id', 'title', 'author', 'isbn', 'cover_url', 'cover_path', 'url', 'store_type', 'estimated_price_cents', 'price_checked_at', 'bought_at'])]
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
            'price_checked_at' => 'datetime',
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

    /**
     * Onde comprar: a loja pedida; sem pedido, o link colado ou, sem ele,
     * a busca na Amazon pelo ISBN ou título.
     */
    public function shopUrl(?string $store = null): string
    {
        $link = $store === null ? null : StoreLinks::url($store, $this->isbn, $this->title, $this->author);

        if ($link !== null) {
            return $link;
        }

        if ($this->url !== null) {
            return $this->url;
        }

        return $this->isbn !== null
            ? AmazonLink::forIsbn($this->isbn)
            : AmazonLink::forTitle($this->title, $this->author);
    }
}
