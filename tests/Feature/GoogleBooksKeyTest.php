<?php

use App\Models\Setting;
use App\Services\BookLookup\GoogleBooksKey;
use App\Services\BookLookup\GoogleBooksProvider;
use Illuminate\Encryption\Encrypter;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

const SAVED_KEY = 'saved-google-books-key-WXYZ';
const ENVIRONMENT_KEY = 'environment-google-books-key';

beforeEach(fn () => config()->set('services.google_books.key', null));

function saveGoogleBooksKey(string $key = SAVED_KEY): void
{
    test()->put(route('profile.google-books-key.update'), ['google_books_key' => $key]);
}

function assertGoogleBooksCalledWith(?string $key): void
{
    Http::fake(['www.googleapis.com/*' => Http::response(['items' => []])]);

    app(GoogleBooksProvider::class)->search('Dom Casmurro');

    Http::assertSent(fn (Request $request) => ($request->data()['key'] ?? null) === $key);
}

test('saving the key confirms it and stores it encrypted', function () {
    $this->from(route('profile.show'))
        ->put(route('profile.google-books-key.update'), ['google_books_key' => '  '.SAVED_KEY.'  '])
        ->assertRedirect(route('profile.show'))
        ->assertSessionHas('toast.title', 'Chave do Google Books salva');

    $stored = Setting::get(GoogleBooksKey::SETTING);

    expect($stored)->not->toContain(SAVED_KEY)
        ->and(Crypt::decryptString($stored))->toBe(SAVED_KEY);
});

test('Google Books receives the saved key instead of the environment one', function () {
    config()->set('services.google_books.key', ENVIRONMENT_KEY);
    saveGoogleBooksKey();

    assertGoogleBooksCalledWith(SAVED_KEY);
});

test('Google Books receives the environment key while none is saved', function () {
    config()->set('services.google_books.key', ENVIRONMENT_KEY);

    assertGoogleBooksCalledWith(ENVIRONMENT_KEY);
});

test('Google Books is called without a key when there is none', function () {
    assertGoogleBooksCalledWith(null);
});

test('removing the key deletes it', function () {
    saveGoogleBooksKey();

    $this->delete(route('profile.google-books-key.destroy'))
        ->assertSessionHas('toast.title', 'Chave do Google Books removida');

    expect(Setting::query()->whereKey(GoogleBooksKey::SETTING)->exists())->toBeFalse();
});

test('a key encrypted with another APP_KEY counts as missing', function () {
    config()->set('services.google_books.key', ENVIRONMENT_KEY);
    $otherAppKey = new Encrypter(Encrypter::generateKey(config()->string('app.cipher')), config()->string('app.cipher'));
    Setting::put(GoogleBooksKey::SETTING, $otherAppKey->encryptString(SAVED_KEY));

    assertGoogleBooksCalledWith(ENVIRONMENT_KEY);
});

test('rejects an invalid key without keeping it in the session', function (string $key) {
    saveGoogleBooksKey();

    $this->put(route('profile.google-books-key.update'), ['google_books_key' => $key])
        ->assertSessionHasErrors('google_books_key');

    expect(app(GoogleBooksKey::class)->current())->toBe(SAVED_KEY)
        ->and(session()->getOldInput('google_books_key'))->toBeNull();
})->with([
    'empty' => '',
    'too short' => 'abc',
    'with spaces' => 'a key that has spaces inside it',
    'too long' => str_repeat('a', 201),
]);

test('the profile page shows only the end of the saved key', function () {
    saveGoogleBooksKey();

    $this->get(route('profile.show'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('google_books_key', ['saved_ending' => 'WXYZ', 'has_environment_key' => false]))
        ->assertDontSee(SAVED_KEY);
});

test('the profile page never receives the environment key', function () {
    config()->set('services.google_books.key', ENVIRONMENT_KEY);

    $this->get(route('profile.show'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('google_books_key', ['saved_ending' => null, 'has_environment_key' => true]))
        ->assertDontSee(ENVIRONMENT_KEY);
});
