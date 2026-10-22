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
 * Downloads covers to the local disk, so the app works offline.
 * In the native app the disk lives in the app's data folder, so covers
 * are served by a route rather than storage:link.
 */
class CoverStore
{
    /** Below this it is a "no cover" placeholder, not a real cover. */
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
     * Looks for a cover by ISBN when the metadata source brought none.
     * Google Books by ISBN is no good: it returns a gray frame instead of a 404.
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

    /** Cover from an Amazon product link, by ASIN. Null if the link has no ASIN or Amazon has no image. */
    public function findByAmazonLink(string $link): ?string
    {
        $asin = AmazonLink::asinFromUrl($link);

        if ($asin === null) {
            return null;
        }

        $url = self::amazonImageUrl($asin);

        return $this->fetch($url) === null ? null : $url;
    }

    /** The ASIN of physical books is the ISBN-10. Without a cover, Amazon returns a 1-pixel GIF. */
    private static function amazonImageUrl(string $asin): string
    {
        return "https://m.media-amazon.com/images/P/{$asin}.01._SCLZZZZZZZ_.jpg";
    }

    /**
     * @return array{body: string, extension: string}|null
     */
    private function fetch(string $url): ?array
    {
        // Without this, Open Library returns an empty image when there is no cover.
        if (str_contains($url, 'covers.openlibrary.org') && ! str_contains($url, 'default=')) {
            $url .= (str_contains($url, '?') ? '&' : '?').'default=false';
        }

        try {
            $response = Http::timeout(10)->get($url);
        } catch (ConnectionException $e) {
            Log::warning('Failed to download cover', ['url' => $url, 'error' => $e->getMessage()]);

            return null;
        }

        $type = strtolower(trim(explode(';', (string) $response->header('Content-Type'))[0]));
        $extension = self::EXTENSIONS[$type] ?? null;

        if (! $response->successful() || $extension === null || strlen($response->body()) < self::MIN_BYTES) {
            return null;
        }

        return ['body' => $response->body(), 'extension' => $extension];
    }

    /** Cover chosen on the Mac (dragged or via the file picker). */
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
