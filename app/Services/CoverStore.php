<?php

namespace App\Services;

use App\Models\Book;
use Illuminate\Http\Client\ConnectionException;
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
        // Sem isso a Open Library devolve uma imagem vazia quando não tem capa.
        if (str_contains($url, 'covers.openlibrary.org') && ! str_contains($url, 'default=')) {
            $url .= (str_contains($url, '?') ? '&' : '?').'default=false';
        }

        try {
            $response = Http::timeout(10)->get($url);
        } catch (ConnectionException $e) {
            Log::warning('Falha ao baixar capa', ['book' => $book->id, 'error' => $e->getMessage()]);

            return false;
        }

        $type = strtolower(trim(explode(';', (string) $response->header('Content-Type'))[0]));
        $extension = self::EXTENSIONS[$type] ?? null;

        if (! $response->successful() || $extension === null || strlen($response->body()) < self::MIN_BYTES) {
            return false;
        }

        $this->delete($book);

        $path = "covers/{$book->id}.{$extension}";
        Storage::disk('local')->put($path, $response->body());
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
