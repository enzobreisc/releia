<?php

namespace App\Services\BookLookup;

use App\Models\Setting;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;

/**
 * The key saved in the app wins over GOOGLE_BOOKS_API_KEY, which the packaged build does not carry.
 */
final class GoogleBooksKey
{
    public const SETTING = 'google_books.key';

    private const VISIBLE_CHARACTERS = 4;

    public function current(): ?string
    {
        return $this->saved() ?? $this->fromEnvironment();
    }

    public function fromEnvironment(): ?string
    {
        $key = config('services.google_books.key');

        return is_string($key) && $key !== '' ? $key : null;
    }

    public function savedEnding(): ?string
    {
        $key = $this->saved();

        return $key === null ? null : substr($key, -self::VISIBLE_CHARACTERS);
    }

    public function save(string $key): void
    {
        Setting::put(self::SETTING, Crypt::encryptString($key));
    }

    public function forget(): void
    {
        Setting::query()->whereKey(self::SETTING)->delete();
    }

    private function saved(): ?string
    {
        $encrypted = Setting::get(self::SETTING);

        if (! is_string($encrypted)) {
            return null;
        }

        try {
            return Crypt::decryptString($encrypted);
        } catch (DecryptException) {
            Log::warning('The saved Google Books key cannot be decrypted with the current APP_KEY');

            return null;
        }
    }
}
