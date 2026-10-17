<?php

namespace App\Support;

/**
 * Links da Amazon Brasil para a lista de compras. Sem API: a busca pelo ISBN
 * sempre abre (o /dp/ dá 404 quando a edição não está à venda lá).
 */
final class AmazonLink
{
    private const BASE = 'https://www.amazon.com.br';

    public static function forIsbn(string $isbn13): string
    {
        return self::search($isbn13);
    }

    public static function forTitle(string $title, string $author = ''): string
    {
        return self::search(trim($title.' '.$author));
    }

    /**
     * ISBN de um link da Amazon colado: o ASIN de livros físicos é o ISBN-10.
     * Devolve null para links sem ASIN (encurtados, buscas) ou de outros produtos.
     */
    public static function isbnFromUrl(string $url): ?string
    {
        if (! self::isAmazon($url)) {
            return null;
        }

        $path = (string) parse_url($url, PHP_URL_PATH);

        if (preg_match('~/(?:dp|gp/product|o/ASIN)/([0-9]{9}[0-9X])(?:[/?]|$)~i', $path, $match) !== 1) {
            return null;
        }

        return Isbn::toIsbn13($match[1]);
    }

    /**
     * ASIN do produto num link da Amazon (/dp/, /gp/product/, /o/ASIN/).
     * Nos livros físicos é o ISBN-10; nos e-books começa com B0.
     */
    public static function asinFromUrl(string $url): ?string
    {
        if (! self::isAmazon($url)) {
            return null;
        }

        $path = (string) parse_url($url, PHP_URL_PATH);

        if (preg_match('~/(?:dp|gp/product|o/ASIN)/([0-9A-Z]{10})(?:[/?]|$)~i', $path, $match) !== 1) {
            return null;
        }

        return strtoupper($match[1]);
    }

    public static function isAmazon(string $url): bool
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        // Só domínios da Amazon (amazon.com.br, amazon.co.uk…), não "amazon.com.br.outro.com".
        return preg_match('/(^|\.)amazon\.(com|co|ca|de|fr|es|it|in|nl|se|pl|sg|ae|sa|eg)(\.[a-z]{2})?$/', $host) === 1;
    }

    private static function search(string $terms): string
    {
        return self::BASE.'/s?'.http_build_query(['k' => $terms, 'i' => 'stripbooks']);
    }
}
