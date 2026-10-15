<?php

use App\Http\Controllers\BookController;
use App\Http\Controllers\BookCoverController;
use App\Http\Controllers\LibraryController;
use App\Http\Controllers\ReadingController;
use App\Http\Controllers\SuggestionController;
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
Route::inertia('/perfil', 'perfil')->name('perfil');
Route::inertia('/estatisticas', 'estatisticas')->name('estatisticas');
Route::inertia('/wrapped', 'wrapped')->name('wrapped');
// Fase 5
Route::get('/suggestions', [SuggestionController::class, 'index'])->name('suggestions.index');
Route::post('/suggestions/generate', [SuggestionController::class, 'generate'])->name('suggestions.generate');
Route::patch('/suggestions/{recommendation}/accept', [SuggestionController::class, 'accept'])->whereNumber('recommendation')->name('suggestions.accept');
Route::patch('/suggestions/{recommendation}/already-read', [SuggestionController::class, 'alreadyRead'])->whereNumber('recommendation')->name('suggestions.already-read');
Route::patch('/suggestions/{recommendation}/dismiss', [SuggestionController::class, 'dismiss'])->whereNumber('recommendation')->name('suggestions.dismiss');
