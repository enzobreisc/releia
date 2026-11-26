<?php

test('the bundle removes the Google Books key from the shipped env', function () {
    expect(config('nativephp.cleanup_env_keys'))->toContain('GOOGLE_BOOKS_API_KEY');
});

test('the bundle leaves out the local storage data', function (string $path) {
    $excludedPatterns = config('nativephp.cleanup_exclude_files');

    expect(collect($excludedPatterns)->contains(fn (string $pattern): bool => fnmatch($pattern, $path)))
        ->toBeTrue();
})->with([
    'stored book covers' => 'storage/app/private/covers/1.jpg',
    'stored author photos' => 'storage/app/private/author-photos/1.jpg',
    'uploaded public files' => 'storage/app/public/example.txt',
    'inertia devtools snapshots' => 'storage/inertia-devtools/01M8AR1TJTB1B0A7BH5EPVHKHB.json',
]);
