<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Desfazer da última ação, por até um minuto.
 *
 * Antes de mudar algo, a ação tira uma foto das linhas que vai tocar (capture).
 * Desfazer devolve essas linhas exatamente como estavam: as que sumiram voltam
 * com o mesmo id, as alteradas voltam aos valores antigos e as criadas depois
 * da foto são apagadas. A foto fica na sessão, que é local ao app.
 *
 * Só a última ação se desfaz: como a foto cobre tabelas inteiras (a fila), voltar
 * uma foto antiga desfaria em silêncio o que veio depois. Cada ação nova substitui
 * a anterior, e um token velho recebe "não dá mais para desfazer".
 *
 * @phpstan-type Scope array{table: string, where: array<string, mixed>, key: string|null}
 * @phpstan-type Snapshot list<array{table: string, where: array<string, mixed>, key: string|null, rows: list<array<string, mixed>>}>
 */
class UndoService
{
    public const TTL_SECONDS = 60;

    public const SESSION_KEY = 'undo';

    /**
     * Linhas de uma tabela que a ação pode mudar. Sem `where`, a tabela inteira
     * (só para tabelas pequenas, como a fila). Tabelas sem id (pivôs) usam key null.
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
     * Ajusta colunas das linhas de uma tabela na foto. Usado quando o desfazer deve
     * manter algo que a ação criou (ex.: o vínculo do item de compra com o livro).
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
     * Guarda a foto e devolve o token que o aviso usa para desfazer.
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

    /** Uma ação nova sem desfazer também encerra o desfazer da anterior. */
    public function forget(): void
    {
        session()->forget(self::SESSION_KEY);
    }

    /**
     * Devolve as linhas da foto. False se o token não é o da última ação ou passou do prazo.
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

        // Pivô: apaga o que existe agora e põe de volta as linhas da foto.
        if ($part['key'] === null) {
            $query()->delete();

            if ($part['rows'] !== []) {
                DB::table($part['table'])->insert($part['rows']);
            }

            return;
        }

        $key = $part['key'];
        $kept = array_map(fn (array $row) => $row[$key], $part['rows']);

        // Linhas criadas depois da foto. Apagar só essas evita que o cascade leve junto as filhas das outras.
        $query()->whereNotIn($key, $kept)->delete();

        foreach ($part['rows'] as $row) {
            DB::table($part['table'])->updateOrInsert([$key => $row[$key]], $row);
        }
    }
}
