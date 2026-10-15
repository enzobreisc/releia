<?php

use App\Http\Controllers\BookController;
use App\Http\Controllers\BookCoverController;
use App\Http\Controllers\GoalController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\LibraryController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\QueueController;
use App\Http\Controllers\QuickLogController;
use App\Http\Controllers\ReadingController;
use App\Http\Controllers\ReadingSessionController;
use App\Http\Controllers\ShoppingController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\SuggestionController;
use App\Http\Controllers\WrappedController;
use Illuminate\Support\Facades\Route;

Route::get('/', [HomeController::class, 'index'])->name('home');

Route::get('/library', [LibraryController::class, 'index'])->name('library.index');
Route::get('/library/add', [BookController::class, 'create'])->name('books.create');
Route::post('/library', [BookController::class, 'store'])->name('books.store');
Route::get('/library/{book}', [BookController::class, 'show'])->whereNumber('book')->name('books.show');
Route::delete('/library/{book}', [BookController::class, 'destroy'])->whereNumber('book')->name('books.destroy');
Route::patch('/library/{book}/reading', [ReadingController::class, 'update'])->whereNumber('book')->name('books.reading');
Route::get('/library/{book}/cover', BookCoverController::class)->whereNumber('book')->name('books.cover');

// Fase 2
Route::put('/goal', [GoalController::class, 'update'])->name('goal.update');
Route::post('/library/{book}/sessions', [ReadingSessionController::class, 'store'])->whereNumber('book')->name('sessions.store');
Route::patch('/sessions/{session}', [ReadingSessionController::class, 'update'])->whereNumber('session')->name('sessions.update');
Route::delete('/sessions/{session}', [ReadingSessionController::class, 'destroy'])->whereNumber('session')->name('sessions.destroy');
Route::get('/quick-log', [QuickLogController::class, 'show'])->name('quick-log');
Route::post('/quick-log', [QuickLogController::class, 'store'])->name('quick-log.store');

// Fase 4
Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
Route::post('/profile/pins', [ProfileController::class, 'pin'])->name('profile.pins.store');
Route::delete('/profile/pins/{book}', [ProfileController::class, 'unpin'])->whereNumber('book')->name('profile.pins.destroy');
Route::get('/stats', [StatsController::class, 'index'])->name('stats.index');
Route::get('/wrapped', [WrappedController::class, 'show'])->name('wrapped.show');

// Fase 3
Route::get('/notes', [NoteController::class, 'index'])->name('notes.index');
Route::post('/notes', [NoteController::class, 'store'])->name('notes.store');
Route::patch('/notes/{note}', [NoteController::class, 'update'])->whereNumber('note')->name('notes.update');
Route::delete('/notes/{note}', [NoteController::class, 'destroy'])->whereNumber('note')->name('notes.destroy');
Route::post('/notes/{note}/review', [NoteController::class, 'review'])->whereNumber('note')->name('notes.review');

Route::get('/queue', [QueueController::class, 'index'])->name('queue.index');
Route::post('/queue/books', [QueueController::class, 'store'])->name('queue.store');
Route::patch('/queue/order', [QueueController::class, 'reorder'])->name('queue.reorder');
Route::delete('/queue/{queueItem}', [QueueController::class, 'destroy'])->whereNumber('queueItem')->name('queue.destroy');
Route::post('/queue/shopping', [ShoppingController::class, 'store'])->name('shopping.store');
Route::delete('/queue/shopping/{shoppingItem}', [ShoppingController::class, 'destroy'])->whereNumber('shoppingItem')->name('shopping.destroy');
Route::post('/queue/shopping/{shoppingItem}/buy', [ShoppingController::class, 'buy'])->whereNumber('shoppingItem')->name('shopping.buy');

// Fase 5
Route::get('/suggestions', [SuggestionController::class, 'index'])->name('suggestions.index');
Route::post('/suggestions/generate', [SuggestionController::class, 'generate'])->name('suggestions.generate');
Route::patch('/suggestions/{recommendation}/accept', [SuggestionController::class, 'accept'])->whereNumber('recommendation')->name('suggestions.accept');
Route::patch('/suggestions/{recommendation}/already-read', [SuggestionController::class, 'alreadyRead'])->whereNumber('recommendation')->name('suggestions.already-read');
Route::patch('/suggestions/{recommendation}/dismiss', [SuggestionController::class, 'dismiss'])->whereNumber('recommendation')->name('suggestions.dismiss');
