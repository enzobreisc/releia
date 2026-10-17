<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('authors', function (Blueprint $table) {
            // Identidade do autor na Open Library ("OL1234A"): grafias diferentes do mesmo nome
            // ("Júnior" e "Junior") apontam para a mesma chave.
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
