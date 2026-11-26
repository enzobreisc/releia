<?php

namespace App\Services\Recommendation;

use App\Services\BookLookup\BookCandidate;
use App\Support\BookIdentity;
use InvalidArgumentException;

/**
 * A candidate with the reason and the source it came from. Without a reason there is no suggestion.
 *
 * The same candidate can come from several of your sources: `also` keeps the others and
 * `affinity` sums their weights.
 */
final readonly class Suggestion
{
    public const BY_AUTHOR = 'author';

    public const BY_SUBJECT = 'subject';

    /**
     * @param  list<Source>  $also  other sources that led to the same candidate
     */
    public function __construct(
        public BookCandidate $candidate,
        public string $reason,
        public Source $basedOn,
        public string $kind = self::BY_AUTHOR,
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
            $this->kind,
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
        return new self($candidate, $reason, $this->basedOn, $this->kind, $this->affinity, $this->also);
    }

    /**
     * The author this suggestion is about: the searched author for a same-author suggestion, so a
     * co-author's name does not count, otherwise the candidate's first author.
     */
    public function authorKey(): ?string
    {
        if ($this->kind === self::BY_AUTHOR) {
            return $this->basedOn->authorKey();
        }

        $author = $this->candidate->authors[0] ?? null;

        return $author === null ? null : BookIdentity::normalize($author);
    }

    /** Same author counts more than subject; popularity breaks ties. */
    public function score(): float
    {
        $base = $this->kind === self::BY_AUTHOR ? 3.0 : 1.0;

        return $base * $this->affinity + 0.5 * log10(1 + ($this->candidate->popularity ?? 0));
    }
}
