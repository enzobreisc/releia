<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shopping_items', function (Blueprint $table) {
            $table->string('cover_url', 2048)->nullable()->after('isbn');
            // Pasted link to one specific listing; without it the app builds an Amazon search.
            $table->string('url', 2048)->nullable()->after('cover_url');
            // Prices are typed by hand, so the check date says how much to trust the value.
            $table->timestamp('price_checked_at')->nullable()->after('estimated_price_cents');
        });
    }

    public function down(): void
    {
        Schema::table('shopping_items', function (Blueprint $table) {
            $table->dropColumn(['cover_url', 'url', 'price_checked_at']);
        });
    }
};
