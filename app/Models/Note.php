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
 * Excerpt, reflection or quote about a book, in Markdown. Tags come from the
 * text itself (#tag), so there is no separate field for them.
 *
 * @property int $id
 * @property int $book_id
 * @property int|null $page
 * @property NoteKind $kind
 * @property string $body_md
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Book $book
 * @property-read Collection<int, Tag> $tags
 */
#[Fillable(['book_id', 'page', 'kind', 'body_md'])]
class Note extends Model
{
    /** @use HasFactory<NoteFactory> */
    use HasFactory;

    /**
     * A tag is "#" followed by a letter, not right after another letter, digit,
     * "/" or "&" (so URL anchors and "a#b" are not tags). "## x" headings do
     * not match either, because a space follows the "#".
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
     * Tags mentioned in the text, unaccented, lowercase and without repeats.
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
