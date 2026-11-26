<?php

use App\Models\Recommendation;
use App\Services\RecommendationService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

const WORK_COVER = 'https://covers.openlibrary.org/b/id/777-L.jpg';

function fakeWorkWithCover(bool $hasEditionCover): void
{
    Http::fake(function (Request $request) use ($hasEditionCover) {
        $url = urldecode($request->url());

        return match (true) {
            str_contains($url, 'covers.openlibrary.org/b/isbn/9788500000010') && $hasEditionCover => Http::response(str_repeat('x', 4096), 200, ['Content-Type' => 'image/jpeg']),
            str_contains($url, 'brasilapi.com.br/api/isbn/v1/9788500000010') => Http::response(['title' => 'A vida do espírito', 'authors' => ['Hannah Arendt']]),
            array_key_exists('author', $request->data()) => Http::response(['docs' => [[
                'key' => '/works/OL1W',
                'title' => 'The Life of the Mind',
                'author_name' => ['Hannah Arendt'],
                'isbn' => ['9788500000010'],
                'cover_i' => 777,
            ]]]),
            default => Http::response([], 404),
        };
    });
}

function suggestedCover(): ?string
{
    ratedBook('Origens do totalitarismo', 'Hannah Arendt', 5);
    app(RecommendationService::class)->generate();

    return Recommendation::sole()->cover_url;
}

test('a suggestion shows the cover of its own edition rather than the one of the work', function () {
    fakeWorkWithCover(hasEditionCover: true);

    expect(suggestedCover())->toBe('https://covers.openlibrary.org/b/isbn/9788500000010-L.jpg');
});

test('the cover of the work remains when the edition has none', function () {
    fakeWorkWithCover(hasEditionCover: false);

    expect(suggestedCover())->toBe(WORK_COVER);
});
