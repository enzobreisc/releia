<?php

use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Services\Recommendation\ProfileReadings;

function profileBookIds(): array
{
    return app(ProfileReadings::class)->get()->pluck('book_id')->sort()->values()->all();
}

test('includes books rated 2 to 5', function () {
    $books = [
        ratedBook('Dois', 'Autor', 2),
        ratedBook('Três', 'Autor', 3),
        ratedBook('Quatro', 'Autor', 4),
        ratedBook('Cinco', 'Autor', 5),
    ];

    expect(profileBookIds())->toBe(collect($books)->pluck('id')->sort()->values()->all());
});

test('excludes books rated 1 and unrated books', function () {
    ratedBook('Um', 'Autor', 1);
    Book::factory()->create();

    expect(profileBookIds())->toBe([]);
});

test('orders the profile readings by rating, then the latest first', function () {
    $threeStar = ratedBook('Três', 'Autor', 3);
    $olderFiveStar = ratedBook('Cinco antigo', 'Autor', 5);
    $twoStar = ratedBook('Dois', 'Autor', 2);
    $newerFiveStar = ratedBook('Cinco novo', 'Autor', 5);

    expect(app(ProfileReadings::class)->get()->pluck('book_id')->all())
        ->toBe([$newerFiveStar->id, $olderFiveStar->id, $threeStar->id, $twoStar->id]);
});

test('uses the rating of the latest reading only', function () {
    $reread = ratedBook('Releitura', 'Autor', 1);
    $reread->readings()->create(['status' => ReadingStatus::Read, 'rating' => 5]);
    $dropped = ratedBook('Abandonado', 'Autor', 5);
    $dropped->readings()->create(['status' => ReadingStatus::Read, 'rating' => 1]);

    expect(profileBookIds())->toBe([$reread->id]);
});
