<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'inicio')->name('inicio');
Route::inertia('/biblioteca', 'biblioteca')->name('biblioteca');
Route::inertia('/livros/novo', 'adicionar')->name('adicionar');
Route::inertia('/notas', 'notas')->name('notas');
Route::inertia('/fila', 'fila')->name('fila');
Route::inertia('/perfil', 'perfil')->name('perfil');
Route::inertia('/estatisticas', 'estatisticas')->name('estatisticas');
Route::inertia('/wrapped', 'wrapped')->name('wrapped');
Route::inertia('/sugestoes', 'sugestoes')->name('sugestoes');
