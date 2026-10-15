<?php

use App\Http\Controllers\BookController;
use App\Http\Controllers\BookCoverController;
use App\Http\Controllers\LibraryController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\QueueController;
use App\Http\Controllers\ReadingController;
use App\Http\Controllers\ShoppingController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'inicio')->name('inicio');

Route::get('/biblioteca', [LibraryController::class, 'index'])->name('biblioteca');
Route::get('/biblioteca/adicionar', [BookController::class, 'create'])->name('adicionar');
Route::post('/biblioteca', [BookController::class, 'store'])->name('livros.store');
Route::get('/biblioteca/{book}', [BookController::class, 'show'])->whereNumber('book')->name('livros.show');
Route::delete('/biblioteca/{book}', [BookController::class, 'destroy'])->whereNumber('book')->name('livros.destroy');
Route::patch('/biblioteca/{book}/leitura', [ReadingController::class, 'update'])->whereNumber('book')->name('livros.leitura');
Route::get('/biblioteca/{book}/capa', BookCoverController::class)->whereNumber('book')->name('livros.capa');

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
Route::inertia('/perfil', 'perfil')->name('perfil');
Route::inertia('/estatisticas', 'estatisticas')->name('estatisticas');
Route::inertia('/wrapped', 'wrapped')->name('wrapped');
Route::inertia('/sugestoes', 'sugestoes')->name('sugestoes');
