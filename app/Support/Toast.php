<?php

namespace App\Support;

use App\Services\UndoService;
use Illuminate\Support\Str;

/**
 * Aviso que aparece depois de uma ação (canto inferior direito). Vai para a
 * sessão como flash, então sobrevive ao redirect e aparece uma vez só.
 *
 * A ação opcional é um botão no aviso: `label`, `method` (get, post ou patch),
 * `url` e `data`. O desfazer é um token do UndoService.
 *
 * @phpstan-type ToastAction array{label: string, method: string, url: string, data?: array<string, mixed>}
 */
final class Toast
{
    public const SESSION_KEY = 'toast';

    /**
     * @param  ToastAction|null  $action
     */
    public static function success(string $title, ?string $sub = null, ?array $action = null, ?string $undo = null): void
    {
        // Ação nova sem desfazer: o desfazer da anterior não vale mais (desfaria esta também).
        if ($undo === null) {
            app(UndoService::class)->forget();
        }

        self::flash('success', $title, $sub, $action, $undo);
    }

    public static function error(string $title, ?string $sub = null): void
    {
        self::flash('error', $title, $sub, null, null);
    }

    /**
     * @param  ToastAction|null  $action
     */
    private static function flash(string $kind, string $title, ?string $sub, ?array $action, ?string $undo): void
    {
        session()->flash(self::SESSION_KEY, [
            // Id único: o mesmo texto duas vezes seguidas são dois avisos.
            'id' => (string) Str::uuid(),
            'kind' => $kind,
            'title' => $title,
            'sub' => $sub,
            'action' => $action,
            'undo' => $undo,
        ]);
    }

    /** "1º", "2º"… para posições na fila e leituras. */
    public static function ordinal(int $number): string
    {
        return $number.'º';
    }
}
