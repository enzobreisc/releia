<?php

namespace App\Support;

use App\Services\UndoService;
use Illuminate\Support\Str;

/**
 * Notice shown after an action (bottom right corner). It goes to the session
 * as a flash, so it survives the redirect and shows only once.
 *
 * The optional action is a button on the notice: `label`, `method` (get, post
 * or patch), `url` and `data`. The undo is an UndoService token.
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
        // A new action without undo: the previous undo is stale (it would undo this one too).
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
            // Unique id: the same text twice in a row is two notices.
            'id' => (string) Str::uuid(),
            'kind' => $kind,
            'title' => $title,
            'sub' => $sub,
            'action' => $action,
            'undo' => $undo,
        ]);
    }
}
