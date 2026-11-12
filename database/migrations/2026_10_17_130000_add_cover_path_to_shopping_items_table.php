<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shopping_items', function (Blueprint $table) {
            // Cover stored locally for books that came from the "want to read" list.
            $table->string('cover_path')->nullable()->after('cover_url');
        });
    }

    public function down(): void
    {
        Schema::table('shopping_items', function (Blueprint $table) {
            $table->dropColumn('cover_path');
        });
    }
};
