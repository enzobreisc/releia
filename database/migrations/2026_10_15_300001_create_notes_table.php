<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('book_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('page')->nullable();
            $table->string('kind')->index();
            $table->text('body_md');
            // Corpo e tags sem acento e em minúsculas, para a busca (⌘F) ignorar acentos.
            $table->text('search_text');
            // Dia em que a nota deve ser revista; a revisão do dia filtra por ele.
            $table->date('next_review_at')->nullable()->index();
            $table->unsignedInteger('review_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notes');
    }
};
