<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookshelves', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedInteger('position')->index();
            $table->string('grouping')->nullable();
            $table->string('group_key')->nullable();
            $table->boolean('is_catch_all')->default(false);
            $table->timestamps();
        });

        Schema::table('books', function (Blueprint $table) {
            $table->foreignId('bookshelf_id')->nullable()->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->dropConstrainedForeignId('bookshelf_id');
        });

        Schema::dropIfExists('bookshelves');
    }
};
