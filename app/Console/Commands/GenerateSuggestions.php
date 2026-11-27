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

        $added = $suggestions->generate();

        if ($added === 0 && $suggestions->isSearchSourceUnavailable()) {
            $this->warn(__('A Open Library está indisponível'));
            $this->warn(__('Tente de novo em alguns minutos.'));

            return self::SUCCESS;
        }

        $this->info(match ($added) {
            0 => __('Nenhuma sugestão nova'),
            1 => __('1 sugestão nova'),
            default => __(':count sugestões novas', ['count' => $added]),
        });

        return self::SUCCESS;
    }
}
