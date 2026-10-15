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

Route::get('/', [HomeController::class, 'index'])->name('inicio');

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

// Fase 2
Route::put('/goal', [GoalController::class, 'update'])->name('goal.update');
Route::post('/library/{book}/sessions', [ReadingSessionController::class, 'store'])->whereNumber('book')->name('sessions.store');
Route::patch('/sessions/{session}', [ReadingSessionController::class, 'update'])->whereNumber('session')->name('sessions.update');
Route::delete('/sessions/{session}', [ReadingSessionController::class, 'destroy'])->whereNumber('session')->name('sessions.destroy');
Route::get('/quick-log', [QuickLogController::class, 'show'])->name('quick-log');
Route::post('/quick-log', [QuickLogController::class, 'store'])->name('quick-log.store');
