<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shopping_items', function (Blueprint $table) {
            // Capa da correspondência encontrada pelo ISBN ou título.
            $table->string('cover_url', 2048)->nullable()->after('isbn');
            // Link colado à mão (um anúncio específico); sem ele, o app gera a busca na Amazon.
            $table->string('url', 2048)->nullable()->after('cover_url');
            // Quando o preço foi anotado: o valor é digitado, então a data diz o quanto confiar nele.
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
