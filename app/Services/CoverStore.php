<?php

namespace App\Services;

use App\Models\Book;
use App\Support\AmazonLink;
use App\Support\Isbn;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Baixa as capas para o disco local, para o app funcionar offline.
 * No app nativo o disco fica na pasta de dados do app, por isso as capas
 * são servidas por uma rota e não por storage:link.
 */
class CoverStore
{
    /** Abaixo disso é um marcador de "sem capa", não uma capa de verdade. */
    private const MIN_BYTES = 1024;

    private const EXTENSIONS = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    public function download(Book $book, string $url): bool
    {
        $image = $this->fetch($url);

        if ($image === null) {
            return false;
        }

        $this->delete($book);

        $path = "covers/{$book->id}.{$image['extension']}";
        Storage::disk('local')->put($path, $image['body']);
        $book->update(['cover_path' => $path]);

        return true;
    }

    /**
     * Procura capa pelo ISBN quando a fonte dos metadados não trouxe nenhuma.
     * O Google Books por ISBN não serve: devolve um quadro cinza em vez de 404.
     */
    public function findByIsbn(string $isbn13): ?string
    {
        $isbn10 = Isbn::toIsbn10($isbn13);

        $candidates = array_filter([
            "https://covers.openlibrary.org/b/isbn/{$isbn13}-L.jpg",
            $isbn10 ? self::amazonImageUrl($isbn10) : null,
        ]);

        foreach ($candidates as $url) {
            if ($this->fetch($url) !== null) {
                return $url;
            }
        }

        return null;
    }

    /** Capa de um link de produto da Amazon, pelo ASIN. Null se o link não tem ASIN ou a Amazon não tem a imagem. */
    public function findByAmazonLink(string $link): ?string
    {
        $asin = AmazonLink::asinFromUrl($link);

        if ($asin === null) {
            return null;
        }

        $url = self::amazonImageUrl($asin);

        return $this->fetch($url) === null ? null : $url;
    }

    /** O ASIN de livros físicos é o ISBN-10. Sem capa, a Amazon devolve um GIF de 1 pixel. */
    private static function amazonImageUrl(string $asin): string
    {
        return "https://m.media-amazon.com/images/P/{$asin}.01._SCLZZZZZZZ_.jpg";
    }

    /**
     * @return array{body: string, extension: string}|null
     */
    private function fetch(string $url): ?array
    {
        // Sem isso a Open Library devolve uma imagem vazia quando não tem capa.
        if (str_contains($url, 'covers.openlibrary.org') && ! str_contains($url, 'default=')) {
            $url .= (str_contains($url, '?') ? '&' : '?').'default=false';
        }

        try {
            $response = Http::timeout(10)->get($url);
        } catch (ConnectionException $e) {
            Log::warning('Falha ao baixar capa', ['url' => $url, 'error' => $e->getMessage()]);

            return null;
        }

        $type = strtolower(trim(explode(';', (string) $response->header('Content-Type'))[0]));
        $extension = self::EXTENSIONS[$type] ?? null;

        if (! $response->successful() || $extension === null || strlen($response->body()) < self::MIN_BYTES) {
            return null;
        }

        return ['body' => $response->body(), 'extension' => $extension];
    }

    /** Capa escolhida no Mac (arrastada ou pelo seletor de arquivos). */
    public function store(Book $book, UploadedFile $file): bool
    {
        $extension = self::EXTENSIONS[(string) $file->getMimeType()] ?? null;

        if ($extension === null) {
            return false;
        }

        $this->delete($book);

        $path = "covers/{$book->id}.{$extension}";
        Storage::disk('local')->put($path, (string) $file->get());
        $book->update(['cover_path' => $path]);

        return true;
    }

    public function delete(Book $book): void
    {
        if ($book->cover_path !== null) {
            Storage::disk('local')->delete($book->cover_path);
        }
    }
}
