<?php

use App\Models\Book;
use App\Models\QueueItem;
use App\Models\ShoppingItem;
use App\Services\ShoppingService;
use App\Services\UndoService;
use Inertia\Testing\AssertableInertia as Assert;

it('marks an item as one to buy now and back', function () {
    $item = ShoppingItem::factory()->create();

    $this->patch(route('shopping.priority', $item), ['is_priority' => true])->assertRedirect();
    expect($item->refresh()->is_priority)->toBeTrue();

    $this->patch(route('shopping.priority', $item), ['is_priority' => false])->assertRedirect();
    expect($item->refresh()->is_priority)->toBeFalse();
});

it('ends the pending undo when the star changes', function () {
    $item = ShoppingItem::factory()->create();
    $this->delete(route('shopping.destroy-many'), ['ids' => [ShoppingItem::factory()->create()->id]]);

    $this->patch(route('shopping.priority', $item), ['is_priority' => true]);

    expect(session()->has(UndoService::SESSION_KEY))->toBeFalse();
});

it('lists the items to buy now first, then the wishlist, then the bought ones', function () {
    ShoppingItem::factory()->create(['title' => 'Desejo']);
    ShoppingItem::factory()->create(['title' => 'Comprado', 'is_priority' => true, 'bought_at' => now()]);
    ShoppingItem::factory()->create(['title' => 'Agora', 'is_priority' => true]);

    $this->get(route('shopping.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('shopping.0.title', 'Agora')
            ->where('shopping.0.is_priority', true)
            ->where('shopping.1.title', 'Desejo')
            ->where('shopping.2.title', 'Comprado'));
});

it('buys the selected items at once and queues them per the saved preference', function () {
    ShoppingService::setQueueOnBuy(true);
    $selected = ShoppingItem::factory()->count(2)->create();
    $other = ShoppingItem::factory()->create();

    $this->post(route('shopping.buy-many'), ['ids' => $selected->modelKeys()])->assertRedirect();

    expect(ShoppingItem::query()->whereNotNull('bought_at')->pluck('id')->all())->toBe($selected->modelKeys())
        ->and($other->refresh()->bought_at)->toBeNull()
        ->and(Book::count())->toBe(2)
        ->and(QueueItem::count())->toBe(2)
        ->and(session('toast.title'))->toBe('2 livros comprados');
});

it('undoes a bulk purchase while keeping the books created for the items', function () {
    ShoppingService::setQueueOnBuy(true);
    $selected = ShoppingItem::factory()->count(2)->create();

    $this->post(route('shopping.buy-many'), ['ids' => $selected->modelKeys()]);
    $this->post(route('undo', session('toast.undo')))->assertRedirect();

    $items = ShoppingItem::query()->orderBy('id')->get();

    expect($items->whereNotNull('bought_at'))->toBeEmpty()
        ->and(QueueItem::count())->toBe(0)
        ->and($items->pluck('book_id')->all())->toBe(Book::query()->orderBy('id')->pluck('id')->all());
});

it('deletes the selected items at once, with undo', function () {
    $selected = ShoppingItem::factory()->count(2)->create();
    $other = ShoppingItem::factory()->create();

    $this->delete(route('shopping.destroy-many'), ['ids' => $selected->modelKeys()])->assertRedirect();

    expect(ShoppingItem::query()->pluck('id')->all())->toBe([$other->id]);

    $this->post(route('undo', session('toast.undo')));

    expect(ShoppingItem::count())->toBe(3);
});

it('rejects an empty or unknown selection', function () {
    $this->post(route('shopping.buy-many'), ['ids' => []])->assertSessionHasErrors('ids');
    $this->delete(route('shopping.destroy-many'), ['ids' => [999]])->assertSessionHasErrors('ids.0');
});
