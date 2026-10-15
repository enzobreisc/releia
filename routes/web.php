<?php

use App\Http\Controllers\BookController;
use App\Http\Controllers\BookCoverController;
use App\Http\Controllers\LibraryController;
use App\Http\Controllers\ReadingController;
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
Route::inertia('/sugestoes', 'sugestoes')->name('sugestoes');
