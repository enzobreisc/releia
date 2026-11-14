<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->renameColumn('pinned_position', 'shelf_position');
        });

        // Old pin slots meant "this absolute slot"; shelf positions mean "rank among placed books".
        DB::table('books')->update(['shelf_position' => null]);
    }

    public function down(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->renameColumn('shelf_position', 'pinned_position');
        });
    }
};
