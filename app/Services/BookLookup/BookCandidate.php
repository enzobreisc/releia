<?php

namespace App\Services\BookLookup;

use App\Enums\BookSource;
use Illuminate\Support\Str;

/**
 * @phpstan-type CandidateArray array{isbn_13: string|null, isbn_10: string|null, title: string, subtitle: string|null, authors: list<string>, publisher: string|null, published_year: int|null, pages: int|null, genre: string|null, description: string|null, cover_url: string|null, source: string, work_key?: string|null, edition_count?: int|null, language?: string|null, popularity?: int|null}
 */
final readonly class BookCandidate
{
    /**
     * @param  list<string>  $authors
     */
    public function __construct(
        public string $title,
        public BookSource $source,
        public ?string $isbn13 = null,
        public ?string $isbn10 = null,
        public ?string $subtitle = null,
        public array $authors = [],
        public ?string $publisher = null,
        public ?int $publishedYear = null,
        public ?int $pages = null,
        public ?string $genre = null,
        public ?string $description = null,
        public ?string $coverUrl = null,
        // Open Library work: searches return works, each with several editions.
        public ?string $workKey = null,
        public ?int $editionCount = null,
        // MARC language code of the edition (por, eng…), when the source provides one.
        public ?string $language = null,
        // How many people want to read or have rated the work (Open Library); used to rank suggestions.
        public ?int $popularity = null,
    ) {}

    /** Fills the empty fields from another source, never overwriting a value already set. */
    public function fillFrom(self $other): self
    {
        return new self(
            title: $this->title,
            source: $this->source,
            isbn13: $this->isbn13 ?? $other->isbn13,
            isbn10: $this->isbn10 ?? $other->isbn10,
            subtitle: $this->subtitle ?? $other->subtitle,
            authors: $this->authors !== [] ? $this->authors : $other->authors,
            publisher: $this->publisher ?? $other->publisher,
            publishedYear: $this->publishedYear ?? $other->publishedYear,
            pages: $this->pages ?? $other->pages,
            genre: $this->genre ?? $other->genre,
            description: $this->description ?? $other->description,
            coverUrl: $this->coverUrl ?? $other->coverUrl,
            workKey: $this->workKey ?? $other->workKey,
            editionCount: $this->editionCount ?? $other->editionCount,
            language: $this->language ?? $other->language,
            popularity: $this->popularity ?? $other->popularity,
        );
    }

    public function isComplete(): bool
    {
        return $this->pages !== null && $this->coverUrl !== null && $this->description !== null && $this->genre !== null;
    }

    /**
     * @return CandidateArray
     */
    public function toArray(): array
    {
        return [
            'isbn_13' => $this->isbn13,
            'isbn_10' => $this->isbn10,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'authors' => $this->authors,
            'publisher' => $this->publisher,
            'published_year' => $this->publishedYear,
            'pages' => $this->pages,
            'genre' => $this->genre,
            'description' => $this->description,
            'cover_url' => $this->coverUrl,
            'source' => $this->source->value,
            'work_key' => $this->workKey,
            'edition_count' => $this->editionCount,
            'language' => $this->language,
            'popularity' => $this->popularity,
        ];
    }

    /**
     * @param  CandidateArray  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            title: $data['title'],
            source: BookSource::from($data['source']),
            isbn13: $data['isbn_13'],
            isbn10: $data['isbn_10'],
            subtitle: $data['subtitle'],
            authors: $data['authors'],
            publisher: $data['publisher'],
            publishedYear: $data['published_year'],
            pages: $data['pages'],
            genre: $data['genre'],
            description: $data['description'],
            coverUrl: $data['cover_url'],
            workKey: $data['work_key'] ?? null,
            editionCount: $data['edition_count'] ?? null,
            language: $data['language'] ?? null,
            popularity: $data['popularity'] ?? null,
        );
    }

    /**
     * Removes repeated authors that differ only in accent or case
     * ("Itamar Vieira Junior" and "Itamar Vieira Júnior").
     *
     * @param  array<mixed>  $names
     * @return list<string>
     */
    public static function uniqueAuthors(array $names): array
    {
        $unique = [];

        foreach ($names as $name) {
            if (! is_string($name) || trim($name) === '') {
                continue;
            }

            $key = Str::of($name)->ascii()->lower()->squish()->toString();
            $unique[$key] ??= trim($name);
        }

        return array_values($unique);
    }

    /** Extracts the year from free-form dates such as "3 dezembro 2019" or "Sep 26, 2008". */
    public static function yearFrom(mixed $date): ?int
    {
        if (is_int($date)) {
            return $date;
        }

        if (is_string($date) && preg_match('/\b(1[5-9]\d{2}|20\d{2})\b/', $date, $match)) {
            return (int) $match[1];
        }

        return null;
    }

    public static function positiveInt(mixed $value): ?int
    {
        return is_numeric($value) && (int) $value > 0 ? (int) $value : null;
    }

    public static function nonEmptyString(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}
