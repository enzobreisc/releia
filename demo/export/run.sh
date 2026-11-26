#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/releia-demo.XXXXXX")"
trap 'rm -rf "$temp_dir"' EXIT

unset DB_URL DATABASE_URL
# The goldens record that a Google Books key is configured; a placeholder keeps that independent of the machine's .env.
export GOOGLE_BOOKS_API_KEY=demo-placeholder
export APP_ENV=local APP_DEBUG=false APP_TIMEZONE=America/Sao_Paulo
export APP_LOCALE=pt_BR APP_FALLBACK_LOCALE=pt_BR APP_FAKER_LOCALE=pt_BR
export DB_CONNECTION=sqlite
export DB_DATABASE="$temp_dir/database.sqlite"
export LARAVEL_STORAGE_PATH="$temp_dir/storage"

mkdir -p "$LARAVEL_STORAGE_PATH/app/private" "$LARAVEL_STORAGE_PATH/app/public" \
    "$LARAVEL_STORAGE_PATH/framework/cache" "$LARAVEL_STORAGE_PATH/framework/sessions" \
    "$LARAVEL_STORAGE_PATH/framework/testing" "$LARAVEL_STORAGE_PATH/framework/views" \
    "$LARAVEL_STORAGE_PATH/logs"
touch "$DB_DATABASE"

cd "$repo_root"
php artisan migrate --force --no-interaction
php demo/export/seed.php
cp "$DB_DATABASE" "$temp_dir/seeded.sqlite"
php demo/export/dump.php
php demo/export/scenarios.php
