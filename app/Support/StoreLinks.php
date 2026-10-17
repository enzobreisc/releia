<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Links de busca em lojas e comparadores brasileiros. Nenhuma tem API aberta de
 * preço, então o app leva até a busca pelo ISBN e quem decide é você.
 */
final class StoreLinks
{
    /** @var array<string, string> chave => nome na tela */
    private const STORES = [
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
        return array_keys(self::STORES);
    }

    /**
     * @return list<array{key: string, label: string, url: string}>
     */
    public static function all(?string $isbn, string $title, string $author = ''): array
    {
        $links = [];

        foreach (self::STORES as $key => $label) {
            $links[] = ['key' => $key, 'label' => $label, 'url' => (string) self::url($key, $isbn, $title, $author)];
        }

        return $links;
    }

    public static function url(string $store, ?string $isbn, string $title, string $author = ''): ?string
    {
        // O ISBN acha a edição exata; sem ele, título e autor.
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
