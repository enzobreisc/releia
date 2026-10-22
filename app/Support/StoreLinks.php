<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Search links for Brazilian stores and price comparers. None has an open price
 * API, so the app links to the ISBN search and the reader decides.
 */
final class StoreLinks
{
    private const STORE_LABELS = [
        'amazon' => 'Amazon',
        'estante_virtual' => 'Estante Virtual',
        'mercado_livre' => 'Mercado Livre',
        'buscape' => 'Buscapé (comparar preços)',
        'americanas' => 'Americanas',
    ];

    /**
     * @return list<string>
     */
    public static function keys(): array
    {
        return array_keys(self::STORE_LABELS);
    }

    /**
     * @return list<array{key: string, label: string, url: string}>
     */
    public static function all(?string $isbn, string $title, string $author = ''): array
    {
        $links = [];

        foreach (self::STORE_LABELS as $key => $label) {
            $links[] = ['key' => $key, 'label' => __($label), 'url' => (string) self::url($key, $isbn, $title, $author)];
        }

        return $links;
    }

    public static function url(string $store, ?string $isbn, string $title, string $author = ''): ?string
    {
        // The ISBN finds the exact edition; without it, fall back to title and author.
        $terms = $isbn ?? trim($title.' '.$author);

        return match ($store) {
            'amazon' => $isbn !== null ? AmazonLink::forIsbn($isbn) : AmazonLink::forTitle($title, $author),
            'estante_virtual' => 'https://www.estantevirtual.com.br/busca?'.http_build_query(['q' => $terms]),
            'mercado_livre' => 'https://lista.mercadolivre.com.br/'.Str::slug($terms),
            'buscape' => 'https://www.buscape.com.br/search?'.http_build_query(['q' => $terms]),
            'americanas' => 'https://www.americanas.com.br/busca/'.rawurlencode($terms),
            default => null,
        };
    }
}
