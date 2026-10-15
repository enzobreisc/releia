<?php

namespace App\Models;

use App\Enums\BookSource;
use Database\Factories\BookFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string|null $isbn_13
 * @property string|null $isbn_10
 * @property string $title
 * @property string|null $subtitle
 * @property string|null $publisher
 * @property int|null $published_year
 * @property int|null $pages
 * @property string|null $genre
 * @property string|null $description
 * @property string|null $cover_path
 * @property BookSource $source
 * @property string $search_text
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, Author> $authors
 * @property-read Collection<int, Reading> $readings
 * @property-read Reading|null $currentReading
 */
#[Fillable([
    'isbn_13', 'isbn_10', 'title', 'subtitle', 'publisher', 'published_year',
    'pages', 'genre', 'description', 'cover_path', 'source',
])]
class Book extends Model
{
    /** @use HasFactory<BookFactory> */
    use HasFactory;

    protected $attributes = [
        'search_text' => '',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'source' => BookSource::class,
            'published_year' => 'integer',
            'pages' => 'integer',
        ];
    }

    /**
     * @return BelongsToMany<Author, $this>
     */
    public function authors(): BelongsToMany
    {
        return $this->belongsToMany(Author::class)
            ->withPivot('position')
            ->orderByPivot('position');
    }

    /**
     * @return HasMany<Reading, $this>
     */
    public function readings(): HasMany
    {
        return $this->hasMany(Reading::class);
    }

    /**
     * A leitura mais recente define a estante do livro.
     *
     * @return HasOne<Reading, $this>
     */
    public function currentReading(): HasOne
    {
        return $this->hasOne(Reading::class)->latestOfMany();
    }

    /**
     * Troca os autores mantendo a ordem informada.
     *
     * @param  list<string>  $names
     */
    public function syncAuthors(array $names): void
    {
        $ids = [];

        foreach (array_values(array_unique(array_filter(array_map('trim', $names)))) as $position => $name) {
            $ids[Author::firstOrCreate(['name' => $name])->id] = ['position' => $position];
        }

        $this->authors()->sync($ids);
        $this->unsetRelation('authors');
    }

    /** Recalcula o texto de busca a partir do título, dos autores e dos ISBNs. */
    public function refreshSearchText(): void
    {
        $this->search_text = self::normalizeSearch(implode(' ', array_filter([
            $this->title,
            $this->subtitle,
            $this->authors->pluck('name')->implode(' '),
            $this->isbn_13,
            $this->isbn_10,
        ])));

        $this->save();
    }

    public static function normalizeSearch(string $value): string
    {
        return Str::of($value)->ascii()->lower()->squish()->toString();
    }
}
