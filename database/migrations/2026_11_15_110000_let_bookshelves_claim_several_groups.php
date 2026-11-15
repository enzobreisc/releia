<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookshelves', function (Blueprint $table) {
            $table->json('group_keys')->nullable();
        });

        foreach (DB::table('bookshelves')->whereNotNull('group_key')->get(['id', 'group_key']) as $shelf) {
            DB::table('bookshelves')->where('id', $shelf->id)->update(['group_keys' => json_encode([$shelf->group_key])]);
        }

        Schema::table('bookshelves', function (Blueprint $table) {
            $table->dropColumn('group_key');
        });
    }

    public function down(): void
    {
        Schema::table('bookshelves', function (Blueprint $table) {
            $table->string('group_key')->nullable();
        });

        foreach (DB::table('bookshelves')->whereNotNull('group_keys')->get(['id', 'group_keys']) as $shelf) {
            $keys = json_decode((string) $shelf->group_keys, true);
            DB::table('bookshelves')->where('id', $shelf->id)->update(['group_key' => $keys[0] ?? null]);
        }

        Schema::table('bookshelves', function (Blueprint $table) {
            $table->dropColumn('group_keys');
        });
    }
};
