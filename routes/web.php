<?php

use App\Http\Controllers\BookController;
use App\Http\Controllers\BookCoverController;
use App\Http\Controllers\LibraryController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReadingController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\WrappedController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'inicio')->name('inicio');

Route::get('/biblioteca', [LibraryController::class, 'index'])->name('biblioteca');
Route::get('/biblioteca/adicionar', [BookController::class, 'create'])->name('adicionar');
Route::post('/biblioteca', [BookController::class, 'store'])->name('livros.store');
Route::get('/biblioteca/{book}', [BookController::class, 'show'])->whereNumber('book')->name('livros.show');
Route::delete('/biblioteca/{book}', [BookController::class, 'destroy'])->whereNumber('book')->name('livros.destroy');
Route::patch('/biblioteca/{book}/leitura', [ReadingController::class, 'update'])->whereNumber('book')->name('livros.leitura');
Route::get('/biblioteca/{book}/capa', BookCoverController::class)->whereNumber('book')->name('livros.capa');

Route::inertia('/notas', 'notas')->name('notas');
Route::inertia('/fila', 'fila')->name('fila');
// Fase 4
Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
Route::post('/profile/pins', [ProfileController::class, 'pin'])->name('profile.pins.store');
Route::delete('/profile/pins/{book}', [ProfileController::class, 'unpin'])->whereNumber('book')->name('profile.pins.destroy');
Route::get('/stats', [StatsController::class, 'index'])->name('stats.index');
Route::get('/wrapped', [WrappedController::class, 'show'])->name('wrapped.show');
Route::inertia('/sugestoes', 'sugestoes')->name('sugestoes');
