<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shopping_items', function (Blueprint $table) {
            $table->id();
            // Preenchido ao comprar: o livro é criado na biblioteca (estante "quero ler").
            $table->foreignId('book_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('author')->default('');
            $table->string('isbn', 13)->nullable();
            $table->string('store_type')->index();
            // Dinheiro sempre em centavos inteiros.
            $table->unsignedInteger('estimated_price_cents')->nullable();
            $table->timestamp('bought_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shopping_items');
    }
};
