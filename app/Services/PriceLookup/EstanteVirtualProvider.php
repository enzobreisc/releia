<?php

namespace App\Services\PriceLookup;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Menor preço de uma edição na Estante Virtual (novos e usados). Não há API:
 * lê o estado que a página de busca embute no HTML, então pode parar de
 * funcionar se o site mudar. Nesse caso devolve null e o preço segue manual.
 */
class EstanteVirtualProvider
{
    private const STATE_MARKER = 'window.__INITIAL_STATE__=';

    /** Preço em centavos, ou null se a edição não está à venda ou a página mudou. */
    public function lowestPriceCents(string $isbn13): ?int
    {
        try {
            $response = Http::timeout(15)
                ->withUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36')
                ->withHeaders(['Accept-Language' => 'pt-BR,pt;q=0.9'])
                ->get('https://www.estantevirtual.com.br/busca', ['q' => $isbn13]);
        } catch (ConnectionException $e) {
            Log::warning('Estante Virtual indisponível', ['error' => $e->getMessage()]);

            return null;
        }

        if (! $response->successful()) {
            Log::warning('Estante Virtual respondeu com erro', ['status' => $response->status()]);

            return null;
        }

        return $this->priceFrom($response->body());
    }

    private function priceFrom(string $html): ?int
    {
        $start = strpos($html, self::STATE_MARKER);

        if ($start === false) {
            Log::warning('Estante Virtual: página sem o estado esperado');

            return null;
        }

        // O JSON vem seguido de mais código; raw_decode lê só o objeto.
        $json = substr($html, $start + strlen(self::STATE_MARKER));
        $state = json_decode($json, true, 512, JSON_INVALID_UTF8_SUBSTITUTE);

        if ($state === null) {
            $state = $this->leadingObject($json);
        }

        $products = is_array($state) ? ($state['SearchPage']['parentSkus'] ?? null) : null;

        if (! is_array($products)) {
            Log::warning('Estante Virtual: formato da busca mudou');

            return null;
        }

        // A entrada "-BK" é o livro do catálogo, com o menor preço entre as ofertas.
        // As demais são anúncios de vendedores, muitas vezes de outros livros.
        foreach ($products as $product) {
            if (! is_array($product) || ! str_ends_with((string) ($product['code'] ?? ''), '-BK')) {
                continue;
            }

            $cents = $product['salePrice'] ?? null;

            if (is_int($cents) && $cents > 0) {
                return $cents;
            }
        }

        return null;
    }

    /**
     * O objeto do estado, ignorando o que vem depois dele no script.
     *
     * @return array<mixed>|null
     */
    private function leadingObject(string $text): ?array
    {
        $depth = 0;
        $inString = false;
        $escaped = false;

        for ($i = 0, $length = strlen($text); $i < $length; $i++) {
            $char = $text[$i];

            if ($inString) {
                if ($escaped) {
                    $escaped = false;
                } elseif ($char === '\\') {
                    $escaped = true;
                } elseif ($char === '"') {
                    $inString = false;
                }

                continue;
            }

            if ($char === '"') {
                $inString = true;
            } elseif ($char === '{') {
                $depth++;
            } elseif ($char === '}' && --$depth === 0) {
                $decoded = json_decode(substr($text, 0, $i + 1), true, 512, JSON_INVALID_UTF8_SUBSTITUTE);

                return is_array($decoded) ? $decoded : null;
            }
        }

        return null;
    }
}
