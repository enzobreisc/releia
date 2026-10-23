<?php

namespace App\Services\AuthorPhoto;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Lead image of the author's Wikipedia article. The article comes from the links on the Open Library
 * record or its Wikidata entry, never from a name search, which would pick up namesakes.
 */
class WikipediaPhotoSource implements AuthorPhotoSource
{
    /** Portuguese first: the app is in pt-BR and its articles use local spellings. */
    private const LANGUAGES = ['pt', 'en'];

    private const TIMEOUT_SECONDS = 8;

    public function findPhotoUrl(array $records): ?string
    {
        $titles = $this->articleTitles($records);

        foreach (self::LANGUAGES as $language) {
            $url = isset($titles[$language]) ? $this->leadImage($language, $titles[$language]) : null;

            if ($url !== null) {
                return $url;
            }
        }

        return null;
    }

    /**
     * @param  list<AuthorRecord>  $records
     * @return array<string, string>
     */
    private function articleTitles(array $records): array
    {
        $titles = [];

        foreach ($records as $record) {
            $titles += $record->wikipediaTitles;
        }

        foreach ($records as $record) {
            if ($record->wikidataId !== null) {
                $titles += $this->sitelinks($record->wikidataId);
            }
        }

        return $titles;
    }

    /**
     * @return array<string, string>
     */
    private function sitelinks(string $wikidataId): array
    {
        $sites = array_map(fn (string $language) => "{$language}wiki", self::LANGUAGES);

        $entity = $this->get('https://www.wikidata.org/w/api.php', [
            'action' => 'wbgetentities',
            'ids' => $wikidataId,
            'props' => 'sitelinks',
            'sitefilter' => implode('|', $sites),
            'format' => 'json',
        ])['entities'][$wikidataId] ?? null;

        $titles = [];

        foreach (self::LANGUAGES as $language) {
            $title = is_array($entity) ? ($entity['sitelinks']["{$language}wiki"]['title'] ?? null) : null;

            if (is_string($title)) {
                $titles[$language] = $title;
            }
        }

        return $titles;
    }

    private function leadImage(string $language, string $title): ?string
    {
        $summary = $this->get("https://{$language}.wikipedia.org/api/rest_v1/page/summary/".rawurlencode(str_replace(' ', '_', $title)), []);
        $source = $summary['thumbnail']['source'] ?? null;

        return ($summary['type'] ?? null) === 'standard' && is_string($source) ? $source : null;
    }

    /**
     * @param  array<string, string>  $query
     * @return array<mixed>
     */
    private function get(string $url, array $query): array
    {
        try {
            $response = Http::acceptJson()
                ->withUserAgent(config('services.open_library.user_agent'))
                ->timeout(self::TIMEOUT_SECONDS)
                ->get($url, $query);
        } catch (ConnectionException $e) {
            Log::warning('Wikipedia unavailable', ['url' => $url, 'error' => $e->getMessage()]);

            return [];
        }

        $json = $response->successful() ? $response->json() : null;

        return is_array($json) ? $json : [];
    }
}
