<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Undo of the last action, for up to a minute.
 *
 * Before changing anything, the action takes a snapshot of the rows it will touch (capture).
 * Undoing puts those rows back exactly as they were: deleted ones return with the same
 * id, changed ones get their old values back and rows created after the snapshot are
 * deleted. The snapshot lives in the session, which is local to the app.
 *
 * Only the last action can be undone: since a snapshot covers whole tables (the queue),
 * restoring an old one would silently undo what came after. Each new action replaces the
 * previous one, and a stale token gets "can no longer undo".
 *
 * @phpstan-type Scope array{table: string, where: array<string, mixed>, key: string|null}
 * @phpstan-type Snapshot list<array{table: string, where: array<string, mixed>, key: string|null, rows: list<array<string, mixed>>}>
 */
class UndoService
{
    public const TTL_SECONDS = 60;

    public const SESSION_KEY = 'undo';

    /**
     * Rows of a table the action may change. Without `where`, the whole table
     * (only for small tables, like the queue). Tables without an id (pivots) use a null key.
     *
     * @param  array<string, mixed>  $where
     * @return Scope
     */
    public static function scope(string $table, array $where = [], ?string $key = 'id'): array
    {
        return ['table' => $table, 'where' => $where, 'key' => $key];
    }

    /**
     * @param  list<Scope>  $scopes
     * @return Snapshot
     */
    public function capture(array $scopes): array
    {
        return array_map(fn (array $scope) => [
            ...$scope,
            'rows' => array_values(array_map(
                self::row(...),
                DB::table($scope['table'])->where($scope['where'])->get()->all(),
            )),
        ], $scopes);
    }

    /**
     * @return array<string, mixed>
     */
    private static function row(object $row): array
    {
        return get_object_vars($row);
    }

    /**
     * Adjusts columns of a table's rows in the snapshot. Used when undo must keep
     * something the action created (e.g. the link between a shopping item and its book).
     *
     * @param  Snapshot  $snapshot
     * @param  array<string, mixed>  $values
     * @return Snapshot
     */
    public function override(array $snapshot, string $table, array $values): array
    {
        foreach ($snapshot as $index => $part) {
            if ($part['table'] === $table) {
                $snapshot[$index]['rows'] = array_map(fn (array $row): array => [...$row, ...$values], $part['rows']);
            }
        }

        return $snapshot;
    }

    /**
     * Stores the snapshot and returns the token the notice uses to undo.
     *
     * @param  Snapshot  $snapshot
     */
    public function remember(array $snapshot): string
    {
        $token = Str::random(24);

        session()->put(self::SESSION_KEY, [
            'token' => $token,
            'expires_at' => Carbon::now()->addSeconds(self::TTL_SECONDS)->timestamp,
            'snapshot' => $snapshot,
        ]);

        return $token;
    }

    /** A new action without undo also ends the undo of the previous one. */
    public function forget(): void
    {
        session()->forget(self::SESSION_KEY);
    }

    /**
     * Restores the snapshot's rows. False if the token is not the last action's or has expired.
     */
    public function undo(string $token): bool
    {
        $stored = session()->get(self::SESSION_KEY);

        if (! is_array($stored) || ($stored['token'] ?? null) !== $token) {
            return false;
        }

        session()->forget(self::SESSION_KEY);

        if (($stored['expires_at'] ?? 0) < Carbon::now()->timestamp) {
            return false;
        }

        /** @var Snapshot $snapshot */
        $snapshot = $stored['snapshot'];

        DB::transaction(function () use ($snapshot) {
            foreach ($snapshot as $part) {
                $this->restore($part);
            }
        });

        return true;
    }

    /**
     * @param  array{table: string, where: array<string, mixed>, key: string|null, rows: list<array<string, mixed>>}  $part
     */
    private function restore(array $part): void
    {
        $query = fn () => DB::table($part['table'])->where($part['where']);

        // Pivot: deletes what exists now and puts the snapshot's rows back.
        if ($part['key'] === null) {
            $query()->delete();

            if ($part['rows'] !== []) {
                DB::table($part['table'])->insert($part['rows']);
            }

            return;
        }

        $key = $part['key'];
        $kept = array_map(fn (array $row) => $row[$key], $part['rows']);

        // Rows created after the snapshot. Deleting only those keeps the cascade from taking the others' children.
        $query()->whereNotIn($key, $kept)->delete();

        foreach ($part['rows'] as $row) {
            DB::table($part['table'])->updateOrInsert([$key => $row[$key]], $row);
        }
    }
}
