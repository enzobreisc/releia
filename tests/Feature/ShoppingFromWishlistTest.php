<?php

use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\ShoppingItem;
use App\Services\LibraryService;
use App\Services\ShoppingService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

it('moves a want-to-read book to the shopping list', function () {
    Http::fake();

    $book = app(LibraryService::class)->add([
        'title' => 'Dom Casmurro',
        'authors' => ['Machado de Assis'],
        'isbn_13' => '9788535911664',
        'status' => ReadingStatus::WantToRead->value,
    ]);

    $this->post(route('books.shopping', $book))->assertRedirect(route('shopping.index'));

    expect(Book::find($book->id))->toBeNull();
    expect(ShoppingItem::query()->where('title', 'Dom Casmurro')->where('author', 'Machado de Assis')->exists())->toBeTrue();
});

it('refuses books already being read', function () {
    $book = app(LibraryService::class)->add([
        'title' => 'Em andamento',
        'authors' => [],
        'status' => ReadingStatus::Reading->value,
    ]);

    $this->post(route('books.shopping', $book))->assertRedirect();

    expect(Book::find($book->id))->not->toBeNull();
    expect(ShoppingItem::count())->toBe(0);
});

it('keeps the cover when moving to shopping and gives it back on buy', function () {
    Http::fake();
    Storage::fake('local');

    $book = app(LibraryService::class)->add([
        'title' => 'Com capa',
        'authors' => [],
        'status' => ReadingStatus::WantToRead->value,
    ]);
    Storage::disk('local')->put('covers/'.$book->id.'.jpg', 'img');
    $book->update(['cover_path' => 'covers/'.$book->id.'.jpg']);

    $this->post(route('books.shopping', $book));

    $item = ShoppingItem::query()->where('title', 'Com capa')->firstOrFail();
    expect($item->cover_path)->not->toBeNull();
    $this->get(route('shopping.cover', $item))->assertOk();

    app(ShoppingService::class)->buy($item, false);

    $bought = Book::query()->where('title', 'Com capa')->firstOrFail();
    expect($bought->cover_path)->not->toBeNull();
    Storage::disk('local')->assertExists($bought->cover_path);
});
