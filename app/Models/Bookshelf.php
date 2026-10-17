<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Prateleira personalizada da estante da biblioteca (não confundir com as estantes
 * por status: Lendo, Quero ler...). A ordem das prateleiras é a coluna position.
 *
 * @property int $id
 * @property string $name
 * @property int $position
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'position'])]
class Bookshelf extends Model
{
    /**
     * @return HasMany<Book, $this>
     */
    public function books(): HasMany
    {
        return $this->hasMany(Book::class)->orderBy('shelf_position');
    }
}
