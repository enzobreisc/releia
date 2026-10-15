<?php

use App\Http\Controllers\BookController;
use App\Http\Controllers\BookCoverController;
use App\Http\Controllers\GoalController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\LibraryController;
use App\Http\Controllers\QuickLogController;
use App\Http\Controllers\ReadingController;
use App\Http\Controllers\ReadingSessionController;
use Illuminate\Support\Facades\Route;

Route::get('/', [HomeController::class, 'index'])->name('home');

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

// Fase 2
Route::put('/goal', [GoalController::class, 'update'])->name('goal.update');
Route::post('/library/{book}/sessions', [ReadingSessionController::class, 'store'])->whereNumber('book')->name('sessions.store');
Route::patch('/sessions/{session}', [ReadingSessionController::class, 'update'])->whereNumber('session')->name('sessions.update');
Route::delete('/sessions/{session}', [ReadingSessionController::class, 'destroy'])->whereNumber('session')->name('sessions.destroy');
Route::get('/quick-log', [QuickLogController::class, 'show'])->name('quick-log');
Route::post('/quick-log', [QuickLogController::class, 'store'])->name('quick-log.store');
