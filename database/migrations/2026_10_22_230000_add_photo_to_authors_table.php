<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('authors', function (Blueprint $table) {
            $table->string('photo_path')->nullable()->after('open_library_key');
            $table->timestamp('photo_looked_up_at')->nullable()->after('photo_path');
        });
    }

    public function down(): void
    {
        Schema::table('authors', function (Blueprint $table) {
            $table->dropColumn(['photo_path', 'photo_looked_up_at']);
        });
    }
};
