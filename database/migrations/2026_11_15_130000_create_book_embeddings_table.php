<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('book_embeddings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('book_id')->constrained()->cascadeOnDelete();
            $table->string('model');
            $table->binary('vector');
            $table->string('source_hash', 64);
            $table->timestamps();

            $table->unique(['book_id', 'model']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('book_embeddings');
    }
};
