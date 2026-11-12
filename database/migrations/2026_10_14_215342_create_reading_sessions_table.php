<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reading_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reading_id')->constrained()->cascadeOnDelete();
            $table->date('read_on')->index();
            $table->unsignedInteger('page_from');
            $table->unsignedInteger('page_to');
            $table->unsignedSmallInteger('minutes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reading_sessions');
    }
};
