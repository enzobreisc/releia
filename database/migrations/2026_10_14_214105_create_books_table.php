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
            // Hand-added books may have no ISBN; SQLite allows several NULLs in a unique index.
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
            // Search columns are unaccented and lowercase, because SQLite's LIKE is accent-sensitive.
            $table->text('search_text');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('books');
    }
};
