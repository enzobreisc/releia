<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recommendations', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            // Vários autores separados por vírgula, como vêm da Open Library.
            $table->string('author')->nullable();
            $table->string('isbn_13', 13)->nullable()->index();
            $table->string('cover_url', 2048)->nullable();
            // Obrigatório: sem motivo não há sugestão.
            $table->text('reason');
            // Obrigatório: toda sugestão nasce de um livro lido. Se ele sair da biblioteca, a sugestão some junto.
            $table->foreignId('based_on_book_id')->constrained('books')->cascadeOnDelete();
            $table->string('status')->default('new')->index();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recommendations');
    }
};
