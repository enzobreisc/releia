<?php

namespace App\Services\Recommendation;

use App\Models\Book;
use App\Services\BookLookup\BookCandidate;
use InvalidArgumentException;

/**
 * Candidato com o motivo e o livro de origem. Sem motivo não existe sugestão.
 */
final readonly class Suggestion
{
    public function __construct(
        public BookCandidate $candidate,
        public string $reason,
        public Book $basedOn,
    ) {
        if (trim($reason) === '') {
            throw new InvalidArgumentException('Sugestão sem motivo.');
        }
    }
}
