<?php

namespace App\Models;

use App\Enums\ShelfGrouping;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A named shelf of the bookcase. Not the same as the status shelves (Reading, Want to read).
 * A shelf with a grouping collects every book of its groups nobody placed by hand;
 * the catch-all shelf takes the books no other shelf claims.
 *
 * @property int $id
 * @property string $name
 * @property int $position
 * @property ShelfGrouping|null $grouping
 * @property list<string>|null $group_keys
 * @property bool $is_catch_all
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'position', 'grouping', 'group_keys', 'is_catch_all'])]
class Bookshelf extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'grouping' => ShelfGrouping::class,
            'group_keys' => 'array',
            'is_catch_all' => 'boolean',
        ];
    }

    public function claims(Book $book): bool
    {
        $group = $this->grouping?->groupOf($book);

        return $group !== null && in_array($group->key, $this->group_keys ?? [], true);
    }
}
