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
            $table->timestamps();
        });

        // Um livro fica em uma prateleira só; sem prateleira, vai para "Sem prateleira".
        Schema::table('books', function (Blueprint $table) {
            $table->foreignId('bookshelf_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('shelf_position')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->dropConstrainedForeignId('bookshelf_id');
            $table->dropColumn('shelf_position');
        });

        Schema::dropIfExists('bookshelves');
    }
};
