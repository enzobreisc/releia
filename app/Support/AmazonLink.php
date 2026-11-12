<?php

namespace App\Support;

/**
 * Amazon Brazil links. There is no API: the ISBN search always opens, because /dp/ returns 404 when the edition is not sold there.
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
     * The ASIN of a physical book is its ISBN-10. Shortened links and searches carry no ASIN.
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
     * Physical books use the ISBN-10 as ASIN; e-books start with B0.
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

        // Only Amazon's own domains: a host like "amazon.com.br.evil.com" must not pass.
        return preg_match('/(^|\.)amazon\.(com|co|ca|de|fr|es|it|in|nl|se|pl|sg|ae|sa|eg)(\.[a-z]{2})?$/', $host) === 1;
    }

    private static function search(string $terms): string
    {
        return self::BASE.'/s?'.http_build_query(['k' => $terms, 'i' => 'stripbooks']);
    }
}
