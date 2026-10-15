<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('books', function (Blueprint $table) {
            $table->id();
            // Livros cadastrados à mão podem não ter ISBN; o SQLite aceita vários NULL num índice único.
            $table->string('isbn_13', 13)->nullable()->unique();
            $table->string('isbn_10', 10)->nullable();
            $table->string('title');
            $table->string('subtitle')->nullable();
            $table->string('publisher')->nullable();
            $table->unsignedSmallInteger('published_year')->nullable();
            $table->unsignedInteger('pages')->nullable();
            $table->string('genre')->nullable()->index();
            $table->text('description')->nullable();
            $table->string('cover_path')->nullable();
            $table->string('source');
            // Título, autores e ISBN sem acento e em minúsculas: o LIKE do SQLite não ignora acentos.
            $table->text('search_text');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('books');
    }
};
