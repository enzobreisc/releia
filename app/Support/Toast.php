<?php

namespace App\Support;

use App\Services\UndoService;
use Illuminate\Support\Str;

/**
 * Stored as a session flash, so the notice survives the redirect and shows only once.
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

    /**
     * @param  ToastAction|null  $action
     */
    public static function error(string $title, ?string $sub = null, ?array $action = null): void
    {
        self::flash('error', $title, $sub, $action, null);
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
