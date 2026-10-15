<?php

namespace App\Models;

use App\Enums\NoteKind;
use Database\Factories\NoteFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Trecho, reflexão ou citação sobre um livro, em Markdown. As tags vêm do
 * próprio texto (#tag), então não há um campo separado para elas.
 *
 * @property int $id
 * @property int $book_id
 * @property int|null $page
 * @property NoteKind $kind
 * @property string $body_md
 * @property string $search_text
 * @property Carbon|null $next_review_at
 * @property int $review_count
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Book $book
 * @property-read Collection<int, Tag> $tags
 */
#[Fillable(['book_id', 'page', 'kind', 'body_md', 'next_review_at', 'review_count'])]
class Note extends Model
{
    /** @use HasFactory<NoteFactory> */
    use HasFactory;

    // Preenchido pelo NoteService (fora do mass assignment), como em Book.
    protected $attributes = [
        'search_text' => '',
        'review_count' => 0,
    ];

    /**
     * Tag é "#" seguido de letra, sem vir logo depois de outra letra, número,
     * "/" ou "&" (assim URLs com âncora e "a#b" não viram tag). Títulos "## x"
     * também não casam, porque o caractere depois do "#" é espaço.
     */
    private const TAG_PATTERN = '/(?<![\p{L}\p{N}_&\/#])#(\p{L}[\p{L}\p{N}_-]{0,39})/u';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kind' => NoteKind::class,
            'page' => 'integer',
            'next_review_at' => 'date',
            'review_count' => 'integer',
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
     * @return BelongsToMany<Tag, $this>
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    /**
     * Tags citadas no texto, sem acento e em minúsculas, sem repetição.
     *
     * @return list<string>
     */
    public static function extractTags(string $body): array
    {
        preg_match_all(self::TAG_PATTERN, $body, $matches);

        $tags = array_map(
            fn (string $name) => Str::of($name)->ascii()->lower()->toString(),
            $matches[1],
        );

        return array_values(array_unique($tags));
    }
}
