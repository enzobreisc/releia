<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('authors', function (Blueprint $table) {
            // Open Library author key ("OL1234A"): different spellings of the same name
            // ("Júnior" and "Junior") point to the same key.
            $table->string('open_library_key')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('authors', function (Blueprint $table) {
            $table->dropColumn('open_library_key');
        });
    }
};
