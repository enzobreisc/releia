<?php

namespace App\Console\Commands;

use App\Services\RecommendationService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/** Mesma busca do botão "Buscar novas sugestões", para rodar pelo terminal. */
#[Signature('releia:suggestions')]
#[Description('Busca sugestões novas a partir dos livros avaliados com 4 ou 5')]
class GenerateSuggestions extends Command
{
    public function handle(RecommendationService $suggestions): int
    {
        if (! $suggestions->hasSources()) {
            $this->warn('Avalie livros com 4 ou 5 estrelas para receber sugestões.');

            return self::SUCCESS;
        }

        $this->info($suggestions->generate().' sugestões novas.');

        return self::SUCCESS;
    }
}
