<?php

namespace App\Services\AuthorPhoto;

use App\Models\Author;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/** Keeps author photos on the local disk, like covers: the app works offline and serves them by route. */
class AuthorPhotoStore
{
    /** Below this it is a placeholder, not a photo. */
    private const MIN_BYTES = 1024;

    private const TIMEOUT_SECONDS = 10;

    private const EXTENSIONS = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    public function download(Author $author, string $url): bool
    {
        try {
            $response = Http::withUserAgent(config('services.open_library.user_agent'))->timeout(self::TIMEOUT_SECONDS)->get($url);
        } catch (ConnectionException $e) {
            Log::warning('Failed to download author photo', ['url' => $url, 'error' => $e->getMessage()]);

            return false;
        }

        $type = strtolower(trim(explode(';', (string) $response->header('Content-Type'))[0]));
        $extension = self::EXTENSIONS[$type] ?? null;

        if (! $response->successful() || $extension === null || strlen($response->body()) < self::MIN_BYTES) {
            return false;
        }

        $this->delete($author);

        $path = "author-photos/{$author->id}.{$extension}";
        Storage::disk('local')->put($path, $response->body());
        $author->update(['photo_path' => $path]);

        return true;
    }

    public function delete(Author $author): void
    {
        if ($author->photo_path !== null) {
            Storage::disk('local')->delete($author->photo_path);
        }
    }
}
