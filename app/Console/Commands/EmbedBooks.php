<?php

namespace App\Console\Commands;

use App\Models\Book;
use App\Services\Ai\BookEmbeddingIndexer;
use App\Services\Ai\EmbeddingUnavailable;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('releia:embed')]
#[Description('Calcula os vetores dos livros novos ou alterados para as sugestões por similaridade')]
class EmbedBooks extends Command
{
    public function handle(BookEmbeddingIndexer $indexer): int
    {
        try {
            $indexed = $indexer->index(Book::query()->get());
        } catch (EmbeddingUnavailable) {
            $this->warn('Ollama indisponível.');

            return self::SUCCESS;
        }

        $this->info($indexed.' livros indexados.');

        return self::SUCCESS;
    }
}
