<?php

use App\Http\Controllers\BookController;
use App\Http\Controllers\BookCoverController;
use App\Http\Controllers\LibraryController;
use App\Http\Controllers\ReadingController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'home')->name('home');

Route::get('/library', [LibraryController::class, 'index'])->name('library.index');
Route::get('/library/add', [BookController::class, 'create'])->name('books.create');
Route::post('/library', [BookController::class, 'store'])->name('books.store');
Route::get('/library/{book}', [BookController::class, 'show'])->whereNumber('book')->name('books.show');
Route::delete('/library/{book}', [BookController::class, 'destroy'])->whereNumber('book')->name('books.destroy');
Route::patch('/library/{book}/reading', [ReadingController::class, 'update'])->whereNumber('book')->name('books.reading');
Route::get('/library/{book}/cover', BookCoverController::class)->whereNumber('book')->name('books.cover');

Route::inertia('/notes', 'notes')->name('notes.index');
Route::inertia('/queue', 'queue')->name('queue.index');
Route::inertia('/profile', 'profile')->name('profile.show');
Route::inertia('/stats', 'stats')->name('stats.index');
Route::inertia('/wrapped', 'wrapped')->name('wrapped.show');
Route::inertia('/suggestions', 'suggestions')->name('suggestions.index');
