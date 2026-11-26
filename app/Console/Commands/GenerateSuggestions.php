<?php

namespace App\Console\Commands;

use App\Services\RecommendationService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('releia:suggestions')]
#[Description('Busca sugestões novas a partir dos livros avaliados com 4 ou 5, de Quero ler e da lista de compras')]
class GenerateSuggestions extends Command
{
    public function handle(RecommendationService $suggestions): int
    {
        if (! $suggestions->hasSources()) {
            $this->warn(__('Avalie livros com 4 ou 5 estrelas, ou adicione livros a Quero ler ou à lista de compras, para receber sugestões.'));

            return self::SUCCESS;
        }

        $this->info(__(':count sugestões novas', ['count' => $suggestions->generate()]));

        return self::SUCCESS;
    }
}
