<?php

namespace App\Services\Recommendation;

use App\Services\BookLookup\BookCandidate;
use InvalidArgumentException;

/**
 * A candidate with the reason and the source it came from. Without a reason there is no suggestion.
 *
 * The same candidate can come from several of your sources: `also` keeps the others and
 * `affinity` sums their weights.
 */
final readonly class Suggestion
{
    private const SAME_AUTHOR_WEIGHT = 3.0;

    /**
     * @param  list<Source>  $also  other sources that led to the same candidate
     */
    public function __construct(
        public BookCandidate $candidate,
        public string $reason,
        public Source $basedOn,
        public float $affinity = 1.0,
        public array $also = [],
    ) {
        if (trim($reason) === '') {
            throw new InvalidArgumentException('A suggestion needs a reason.');
        }
    }

    public function withSource(Source $source): self
    {
        return new self(
            $this->candidate,
            $this->reason,
            $this->basedOn,
            $this->affinity + $source->weight,
            [...$this->also, $source],
        );
    }

    /** A source is included when it is the same instance, or the same book as one already included. */
    public function includes(Source $source): bool
    {
        foreach ([$this->basedOn, ...$this->also] as $included) {
            if ($included === $source || ($source->book !== null && $included->book?->id === $source->book->id)) {
                return true;
            }
        }

        return false;
    }

    public function withCandidate(BookCandidate $candidate, string $reason): self
    {
        return new self($candidate, $reason, $this->basedOn, $this->affinity, $this->also);
    }

    /** The searched author, so a co-author's name does not count. */
    public function authorKey(): ?string
    {
        return $this->basedOn->authorKey();
    }

    /** Works of authors you point to more often come first; popularity breaks ties. */
    public function score(): float
    {
        return self::SAME_AUTHOR_WEIGHT * $this->affinity + 0.5 * log10(1 + ($this->candidate->popularity ?? 0));
    }
}
