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
            // Set on purchase: the book is created in the library ("want to read" shelf).
            $table->foreignId('book_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('author')->default('');
            $table->string('isbn', 13)->nullable();
            $table->string('store_type')->index();
            // Money is always stored as integer cents.
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
