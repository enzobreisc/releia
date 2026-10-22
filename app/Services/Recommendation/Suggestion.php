<?php

namespace App\Services\Recommendation;

use App\Models\Book;
use App\Services\BookLookup\BookCandidate;
use InvalidArgumentException;

/**
 * A candidate with the reason and the source book. Without a reason there is no suggestion.
 *
 * The same candidate can come from several of your books: `also` keeps the others and
 * `affinity` sums the weight of the ratings of all of them.
 */
final readonly class Suggestion
{
    public const BY_AUTHOR = 'author';

    public const BY_SUBJECT = 'subject';

    /**
     * @param  list<Book>  $also  outros livros que levaram ao mesmo candidato
     */
    public function __construct(
        public BookCandidate $candidate,
        public string $reason,
        public Book $basedOn,
        public string $kind = self::BY_AUTHOR,
        public float $affinity = 1.0,
        public array $also = [],
    ) {
        if (trim($reason) === '') {
            throw new InvalidArgumentException('A suggestion needs a reason.');
        }
    }

    /** One more of your books pointing to the same candidate. */
    public function withSource(Book $book, float $weight): self
    {
        return new self(
            $this->candidate,
            $this->reason,
            $this->basedOn,
            $this->kind,
            $this->affinity + $weight,
            [...$this->also, $book],
        );
    }

    public function withCandidate(BookCandidate $candidate, string $reason): self
    {
        return new self($candidate, $reason, $this->basedOn, $this->kind, $this->affinity, $this->also);
    }

    /** Same author counts more than subject; popularity breaks ties. */
    public function score(): float
    {
        $base = $this->kind === self::BY_AUTHOR ? 3.0 : 1.0;

        return $base * $this->affinity + 0.5 * log10(1 + ($this->candidate->popularity ?? 0));
    }
}
