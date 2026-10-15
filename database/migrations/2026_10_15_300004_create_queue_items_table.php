<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('queue_items', function (Blueprint $table) {
            $table->id();
            // Um livro entra na fila uma vez só.
            $table->foreignId('book_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedInteger('position')->index();
            $table->timestamp('added_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('queue_items');
    }
};
