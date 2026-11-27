<?php

use App\Models\Setting;
use Illuminate\Support\Facades\Schema;

const DROP_BOOK_EMBEDDINGS_MIGRATION = 'migrations/2026_11_27_083533_drop_book_embeddings_table.php';

test('the migration drops the embeddings table and the local AI setting', function () {
    Setting::put('ai.enabled', true);
    $migration = require database_path(DROP_BOOK_EMBEDDINGS_MIGRATION);
    $migration->down();

    $migration->up();

    expect(Schema::hasTable('book_embeddings'))->toBeFalse()
        ->and(Setting::query()->whereKey('ai.enabled')->exists())->toBeFalse();
});

test('rolling the migration back recreates the embeddings table', function () {
    $migration = require database_path(DROP_BOOK_EMBEDDINGS_MIGRATION);
    $migration->up();

    $migration->down();

    expect(Schema::hasTable('book_embeddings'))->toBeTrue()
        ->and(Schema::getColumnListing('book_embeddings'))->toContain('book_id', 'model', 'vector', 'source_hash');
});
