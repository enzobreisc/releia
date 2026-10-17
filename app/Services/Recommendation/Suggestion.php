<?php

namespace App\Services\Recommendation;

use App\Models\Book;
use App\Services\BookLookup\BookCandidate;
use InvalidArgumentException;

/**
 * Candidato com o motivo e o livro de origem. Sem motivo não existe sugestão.
 *
 * O mesmo candidato pode vir de vários livros seus: `also` guarda os outros e
 * `affinity` soma o peso das notas de todos eles.
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
            throw new InvalidArgumentException('Sugestão sem motivo.');
        }
    }

    /** Mais um livro seu que aponta para o mesmo candidato. */
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

    /** Mesmo autor vale mais que assunto; popularidade desempata. */
    public function score(): float
    {
        $base = $this->kind === self::BY_AUTHOR ? 3.0 : 1.0;

        return $base * $this->affinity + 0.5 * log10(1 + ($this->candidate->popularity ?? 0));
    }
}
