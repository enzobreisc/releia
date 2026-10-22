<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Only the Notes screen searched and reviewed notes; it was removed.
        Schema::table('notes', function (Blueprint $table) {
            $table->dropIndex(['next_review_at']);
            $table->dropColumn(['search_text', 'next_review_at', 'review_count']);
        });
    }

    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->text('search_text')->default('');
            $table->date('next_review_at')->nullable()->index();
            $table->unsignedInteger('review_count')->default(0);
        });
    }
};
