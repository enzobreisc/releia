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
            $table->string('author')->nullable();
            $table->string('isbn_13', 13)->nullable()->index();
            $table->string('cover_url', 2048)->nullable();
            // Required: a suggestion always has a reason.
            $table->text('reason');
            // Required: every suggestion comes from a read book and is deleted together with it.
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
