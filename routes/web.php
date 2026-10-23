<?php

use App\Http\Controllers\AmazonCoverController;
use App\Http\Controllers\AuthorController;
use App\Http\Controllers\BookController;
use App\Http\Controllers\BookCoverController;
use App\Http\Controllers\BookshelfController;
use App\Http\Controllers\GoalController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\LibraryController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\QueueController;
use App\Http\Controllers\QuickLogController;
use App\Http\Controllers\ReadingController;
use App\Http\Controllers\ReadingSessionController;
use App\Http\Controllers\ShoppingController;
use App\Http\Controllers\ShoppingCoverController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\SuggestionController;
use App\Http\Controllers\TimelineController;
use App\Http\Controllers\UndoController;
use App\Http\Controllers\WrappedController;
use Illuminate\Support\Facades\Route;

Route::get('/', [HomeController::class, 'index'])->name('home');

Route::get('/library', [LibraryController::class, 'index'])->name('library.index');
Route::get('/library/add', [BookController::class, 'create'])->name('books.create');
Route::post('/library', [BookController::class, 'store'])->name('books.store');
Route::get('/library/amazon-cover', AmazonCoverController::class)->name('books.amazonCover');
Route::get('/library/{book}', [BookController::class, 'show'])->whereNumber('book')->name('books.show');
Route::patch('/library/{book}', [BookController::class, 'update'])->whereNumber('book')->name('books.update');
Route::delete('/library/{book}', [BookController::class, 'destroy'])->whereNumber('book')->name('books.destroy');
Route::patch('/library/{book}/reading', [ReadingController::class, 'update'])->whereNumber('book')->name('books.reading');
Route::get('/library/{book}/cover', BookCoverController::class)->whereNumber('book')->name('books.cover');
Route::post('/bookshelves', [BookshelfController::class, 'store'])->name('bookshelves.store');
Route::patch('/bookshelves/{bookshelf}', [BookshelfController::class, 'update'])->whereNumber('bookshelf')->name('bookshelves.update');
Route::delete('/bookshelves/{bookshelf}', [BookshelfController::class, 'destroy'])->whereNumber('bookshelf')->name('bookshelves.destroy');
Route::patch('/library/{book}/bookshelf', [BookshelfController::class, 'move'])->whereNumber('book')->name('books.bookshelf');
Route::post('/library/{book}/start', [ReadingController::class, 'start'])->whereNumber('book')->name('books.start');
Route::post('/library/{book}/reread', [ReadingController::class, 'reread'])->whereNumber('book')->name('books.reread');

Route::get('/authors', [AuthorController::class, 'index'])->name('authors.index');
Route::get('/authors/{author}', [AuthorController::class, 'show'])->whereNumber('author')->name('authors.show');
Route::get('/authors/{author}/works', [AuthorController::class, 'works'])->whereNumber('author')->name('authors.works');

// Lifecycle of each reading, and undo
Route::post('/readings/{reading}/finish', [ReadingController::class, 'finish'])->whereNumber('reading')->name('readings.finish');
Route::post('/readings/{reading}/abandon', [ReadingController::class, 'abandon'])->whereNumber('reading')->name('readings.abandon');
Route::post('/readings/{reading}/reopen', [ReadingController::class, 'reopen'])->whereNumber('reading')->name('readings.reopen');
Route::patch('/readings/{reading}/dates', [ReadingController::class, 'dates'])->whereNumber('reading')->name('readings.dates');
Route::delete('/readings/{reading}', [ReadingController::class, 'destroy'])->whereNumber('reading')->name('readings.destroy');
Route::post('/undo/{token}', UndoController::class)->where('token', '[A-Za-z0-9]+')->name('undo');

// Fase 2
Route::put('/goal', [GoalController::class, 'update'])->name('goal.update');
Route::post('/library/{book}/sessions', [ReadingSessionController::class, 'store'])->whereNumber('book')->name('sessions.store');
Route::patch('/sessions/{session}', [ReadingSessionController::class, 'update'])->whereNumber('session')->name('sessions.update');
Route::delete('/sessions/{session}', [ReadingSessionController::class, 'destroy'])->whereNumber('session')->name('sessions.destroy');
Route::get('/quick-log', [QuickLogController::class, 'show'])->name('quick-log');
Route::post('/quick-log', [QuickLogController::class, 'store'])->name('quick-log.store');
Route::post('/quick-log/timer', [QuickLogController::class, 'start'])->name('quick-log.timer.start');
Route::post('/quick-log/timer/pause', [QuickLogController::class, 'pause'])->name('quick-log.timer.pause');
Route::post('/quick-log/timer/resume', [QuickLogController::class, 'resume'])->name('quick-log.timer.resume');
Route::post('/quick-log/timer/finish', [QuickLogController::class, 'finish'])->name('quick-log.timer.finish');
Route::delete('/quick-log/timer', [QuickLogController::class, 'discard'])->name('quick-log.timer.discard');
Route::post('/quick-log/books', [QuickLogController::class, 'startBook'])->name('quick-log.books');

// Fase 4
Route::put('/locale', [LocaleController::class, 'update'])->name('locale.update');
Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');
Route::post('/profile/pins', [ProfileController::class, 'pin'])->name('profile.pins.store');
Route::delete('/profile/pins/{book}', [ProfileController::class, 'unpin'])->whereNumber('book')->name('profile.pins.destroy');
Route::get('/timeline', [TimelineController::class, 'index'])->name('timeline.index');
Route::get('/stats', [StatsController::class, 'index'])->name('stats.index');
Route::get('/wrapped', [WrappedController::class, 'show'])->name('wrapped.show');

// Fase 3
Route::post('/notes', [NoteController::class, 'store'])->name('notes.store');
Route::patch('/notes/{note}', [NoteController::class, 'update'])->whereNumber('note')->name('notes.update');
Route::delete('/notes/{note}', [NoteController::class, 'destroy'])->whereNumber('note')->name('notes.destroy');

Route::get('/queue', [QueueController::class, 'index'])->name('queue.index');
Route::post('/queue/books', [QueueController::class, 'store'])->name('queue.store');
Route::patch('/queue/order', [QueueController::class, 'reorder'])->name('queue.reorder');
Route::delete('/queue/{queueItem}', [QueueController::class, 'destroy'])->whereNumber('queueItem')->name('queue.destroy');
Route::delete('/queue/books/{book}', [QueueController::class, 'destroyBook'])->whereNumber('book')->name('queue.books.destroy');
Route::get('/shopping', [ShoppingController::class, 'index'])->name('shopping.index');
Route::post('/shopping', [ShoppingController::class, 'store'])->name('shopping.store');
Route::patch('/shopping/{shoppingItem}', [ShoppingController::class, 'update'])->whereNumber('shoppingItem')->name('shopping.update');
Route::get('/shopping/{shoppingItem}/cover', ShoppingCoverController::class)->whereNumber('shoppingItem')->name('shopping.cover');
Route::post('/shopping/{shoppingItem}/price', [ShoppingController::class, 'lookupPrice'])->whereNumber('shoppingItem')->name('shopping.price');
Route::post('/shopping/{shoppingItem}/open', [ShoppingController::class, 'open'])->whereNumber('shoppingItem')->name('shopping.open');
Route::delete('/shopping/{shoppingItem}', [ShoppingController::class, 'destroy'])->whereNumber('shoppingItem')->name('shopping.destroy');
Route::post('/library/{book}/shopping', [ShoppingController::class, 'fromBook'])->whereNumber('book')->name('books.shopping');
Route::post('/shopping/{shoppingItem}/buy', [ShoppingController::class, 'buy'])->whereNumber('shoppingItem')->name('shopping.buy');
Route::post('/shopping/{shoppingItem}/unbuy', [ShoppingController::class, 'unbuy'])->whereNumber('shoppingItem')->name('shopping.unbuy');
Route::put('/shopping/preference', [ShoppingController::class, 'preference'])->name('shopping.preference');

// Fase 5
Route::get('/suggestions', [SuggestionController::class, 'index'])->name('suggestions.index');
Route::post('/suggestions/generate', [SuggestionController::class, 'generate'])->name('suggestions.generate');
Route::get('/suggestions/{recommendation}/editions', [SuggestionController::class, 'editions'])->whereNumber('recommendation')->name('suggestions.editions');
Route::patch('/suggestions/{recommendation}/accept', [SuggestionController::class, 'accept'])->whereNumber('recommendation')->name('suggestions.accept');
Route::patch('/suggestions/{recommendation}/already-read', [SuggestionController::class, 'alreadyRead'])->whereNumber('recommendation')->name('suggestions.already-read');
Route::patch('/suggestions/{recommendation}/dismiss', [SuggestionController::class, 'dismiss'])->whereNumber('recommendation')->name('suggestions.dismiss');
