<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string|null $open_library_key
 * @property string|null $photo_path
 * @property Carbon|null $photo_looked_up_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'open_library_key', 'photo_path', 'photo_looked_up_at'])]
class Author extends Model
{
    /**
     * @return BelongsToMany<Book, $this>
     */
    public function books(): BelongsToMany
    {
        return $this->belongsToMany(Book::class);
    }

    public function photoUrl(): ?string
    {
        return $this->photo_path === null
            ? null
            : route('authors.photo', ['author' => $this, 'v' => $this->photo_looked_up_at?->timestamp], absolute: false);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['photo_looked_up_at' => 'datetime'];
    }
}
