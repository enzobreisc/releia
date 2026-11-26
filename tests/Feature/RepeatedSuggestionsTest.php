<?php

use App\Enums\RecommendationStatus;
use App\Models\Recommendation;
use App\Services\RecommendationService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

const WORKS_BY_AUTHOR = [
    'Autora Um' => ['Primeiro Rio', '9788535900019'],
    'Autora Dois' => ['Segunda Ponte', '9788535900026'],
    'Autora Tres' => ['Terceira Casa', '9788535900033'],
    'Autora Quatro' => ['Quarto Vento', '9788535900040'],
];

beforeEach(fn () => Storage::fake('local'));

function fakeOneWorkPerAuthor(): void
{
    Http::fake(function (Request $request) {
        $url = urldecode($request->url());

        if (preg_match('/bibkeys=ISBN:(\d{13})/', $url, $match) === 1) {
            foreach (WORKS_BY_AUTHOR as $author => [$title, $isbn]) {
                if ($isbn === $match[1]) {
                    return Http::response(["ISBN:{$isbn}" => [
                        'title' => $title,
                        'authors' => [['name' => $author]],
                        'cover' => ['large' => 'https://covers.openlibrary.org/b/id/1-L.jpg'],
                        'number_of_pages' => 200,
                        'subjects' => [['name' => 'Fiction']],
                        'description' => 'x',
                    ]]);
                }
            }
        }

        foreach (WORKS_BY_AUTHOR as $author => [$title, $isbn]) {
            if (($request->data()['author'] ?? null) === $author) {
                return Http::response(['docs' => [[
                    'key' => '/works/'.$isbn,
                    'title' => $title,
                    'author_name' => [$author],
                    'isbn' => [$isbn],
                ]]]);
            }
        }

        return Http::response(['docs' => []]);
    });
}

function rateOneBookPerAuthor(): void
{
    foreach (array_keys(WORKS_BY_AUTHOR) as $author) {
        ratedBook("Livro lido de {$author}", $author, 5);
    }
}

function expireSuggestionsOf(string ...$authors): void
{
    foreach ($authors as $author) {
        [$title, $isbn] = WORKS_BY_AUTHOR[$author];

        Recommendation::factory()->create([
            'title' => $title,
            'author' => $author,
            'isbn_13' => $isbn,
            'based_on_book_id' => null,
            'status' => RecommendationStatus::Expired,
        ]);
    }
}

test('a suggestion pushed out of the pending list is kept as expired', function () {
    fakeOneWorkPerAuthor();
    rateOneBookPerAuthor();
    $oldest = Recommendation::factory()->create(['based_on_book_id' => null]);
    Recommendation::factory()->count(59)->create(['based_on_book_id' => null]);

    app(RecommendationService::class)->generate();

    expect($oldest->refresh()->status)->toBe(RecommendationStatus::Expired)
        ->and(Recommendation::where('status', RecommendationStatus::New)->count())->toBe(60);
});

test('a search brings back at most two expired suggestions and keeps the new ones', function () {
    fakeOneWorkPerAuthor();
    rateOneBookPerAuthor();
    expireSuggestionsOf('Autora Um', 'Autora Dois', 'Autora Tres');

    expect(app(RecommendationService::class)->generate())->toBe(3);

    $pending = Recommendation::where('status', RecommendationStatus::New)->pluck('title');

    expect($pending)->toContain('Quarto Vento')
        ->and($pending->intersect(['Primeiro Rio', 'Segunda Ponte', 'Terceira Casa']))->toHaveCount(2);
});

test('a dismissed suggestion stays out even if it had expired before', function () {
    fakeOneWorkPerAuthor();
    rateOneBookPerAuthor();
    expireSuggestionsOf('Autora Um');
    Recommendation::query()->sole()->replicate()->fill(['status' => RecommendationStatus::Dismissed])->save();

    app(RecommendationService::class)->generate();

    expect(Recommendation::where('status', RecommendationStatus::New)->pluck('title'))
        ->not->toContain('Primeiro Rio');
});
