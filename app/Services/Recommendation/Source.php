<?php

namespace App\Services\Recommendation;

use App\Models\Book;
use App\Models\ShoppingItem;
use App\Support\BookIdentity;

/**
 * A title of yours that a search starts from. Its author leads to other works.
 */
final readonly class Source
{
    private const REQUESTED_WEIGHT = 1.0;

    public function __construct(
        public string $title,
        public ?string $author,
        public float $weight,
        public SourceOrigin $origin,
        public ?Book $book = null,
        public ?RequestedAuthor $requested = null,
    ) {}

    public static function rated(Book $book, float $weight): self
    {
        return new self($book->title, self::searchedName($book), $weight, SourceOrigin::Rated, $book);
    }

    public static function wantToRead(Book $book): self
    {
        return new self($book->title, self::searchedName($book), SourceBooks::FOUR_STAR_WEIGHT, SourceOrigin::WantToRead, $book);
    }

    /** An author the request asks for: its title is the author's name, and it has no book of yours behind it. */
    public static function requested(RequestedAuthor $author): self
    {
        return new self($author->name, $author->name, self::REQUESTED_WEIGHT, SourceOrigin::Requested, requested: $author);
    }

    /** A shopping item is not in the library yet, so it has no book; its weight matches a "want to read" book. */
    public static function shoppingItem(ShoppingItem $item): self
    {
        return new self($item->title, AuthorNames::primary($item->author), SourceBooks::FOUR_STAR_WEIGHT, SourceOrigin::Shopping);
    }

    /** The first author of the book, in given-names order: a catalog name may be "Surname, Given". */
    private static function searchedName(Book $book): ?string
    {
        $name = $book->authors->first()?->name;

        return $name === null ? null : BookIdentity::givenNamesFirst($name);
    }

    /**
     * @param  string  $titles  the source title, or the titles of all the books that led to the same work
     */
    public function authorReason(string $titles): string
    {
        return match ($this->origin) {
            SourceOrigin::Rated => __('mesmo autor que :titles', ['titles' => $titles]),
            SourceOrigin::WantToRead => __('mesmo autor que :titles, que você quer ler', ['titles' => $titles]),
            SourceOrigin::Shopping => __('mesmo autor que :titles, da sua lista de compras', ['titles' => $titles]),
            SourceOrigin::Requested => __(':titles, como você pediu', ['titles' => $titles]),
        };
    }

    public function authorKey(): ?string
    {
        return $this->author === null ? null : BookIdentity::normalize($this->author);
    }

    /** Whether a name on a work is this source's author: a requested one may match loosely. */
    public function matchesAuthor(string $name): bool
    {
        return $this->requested?->matches($name) ?? BookIdentity::normalize($name) === $this->authorKey();
    }
}
