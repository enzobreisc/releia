<?php

namespace App\Native;

use App\Events\QuickLogShortcutPressed;
use App\Http\Middleware\SetLocale;
use App\Models\Setting;
use Native\Desktop\Facades\GlobalShortcut;
use Native\Desktop\Facades\MenuBar;
use Throwable;

/**
 * Everything native about the quick log lives here: menu bar icon and global
 * shortcut. Called only on native app boot, never from controllers.
 */
final class QuickLog
{
    public const DEFAULT_SHORTCUT = 'CmdOrCtrl+Shift+L';

    /** Creates the menu bar icon and registers the current shortcut. */
    public static function install(): void
    {
        self::installMenuBar();
        self::registerShortcut(self::shortcut());
    }

    /**
     * The 360×560 window loads the day's reading (timer and page). The "Template"
     * icon adapts to macOS light and dark themes. The tooltip is set once at boot,
     * so a language change shows up after a restart.
     */
    public static function installMenuBar(): void
    {
        MenuBar::create()
            ->icon(public_path('menubar/releiaTemplate.png'))
            ->tooltip(self::tooltip())
            ->url(url('/quick-log'))
            ->width(360)
            ->height(560)
            ->resizable(false)
            // Without this the app disappears from the Dock once it becomes just a menu bar icon.
            ->showDockIcon();
    }

    private static function tooltip(): string
    {
        try {
            $locale = SetLocale::current()->value;
        } catch (Throwable) {
            $locale = config('app.locale');
        }

        return trans('Leitura do dia', [], $locale);
    }

    /** Combination stored in settings, or the default when there is none or the database is not ready. */
    public static function shortcut(): string
    {
        try {
            $key = Setting::get('quick_log_shortcut');
        } catch (Throwable) {
            // Without the table (database not migrated yet) the app opens with the default.
            return self::DEFAULT_SHORTCUT;
        }

        return is_string($key) && $key !== '' ? $key : self::DEFAULT_SHORTCUT;
    }

    public static function registerShortcut(string $key): void
    {
        GlobalShortcut::key($key)
            ->event(QuickLogShortcutPressed::class)
            ->register();
    }

    /**
     * Replaces the combination: releases the previous one before registering the new one,
     * because Electron does not remove the old one on its own. Used when the user changes the shortcut.
     */
    public static function replaceShortcut(string $previous, string $next): void
    {
        GlobalShortcut::key($previous)->unregister();
        self::registerShortcut($next);
    }
}
