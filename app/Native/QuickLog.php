<?php

namespace App\Native;

use App\Events\QuickLogShortcutPressed;
use App\Models\Setting;
use Native\Desktop\Facades\GlobalShortcut;
use Native\Desktop\Facades\MenuBar;
use Throwable;

/**
 * Tudo que é nativo do registro rápido fica aqui: ícone da barra de menu e
 * atalho global. Chamado só no boot do app nativo, nunca em controllers.
 */
final class QuickLog
{
    public const DEFAULT_SHORTCUT = 'CmdOrCtrl+Shift+L';

    /** Cria o ícone da barra de menu e registra o atalho atual. */
    public static function install(): void
    {
        self::installMenuBar();
        self::registerShortcut(self::shortcut());
    }

    /**
     * A janela de 360×560 carrega a leitura do dia (timer e página). O ícone
     * "Template" se adapta ao tema claro ou escuro do macOS.
     */
    public static function installMenuBar(): void
    {
        MenuBar::create()
            ->icon(public_path('menubar/releiaTemplate.png'))
            ->tooltip('Leitura do dia')
            ->url(url('/quick-log'))
            ->width(360)
            ->height(560)
            ->resizable(false)
            // Sem isso o app some do Dock ao virar só ícone de barra de menu.
            ->showDockIcon();
    }

    /** Combinação guardada em settings, ou o padrão se não houver ou o banco não estiver pronto. */
    public static function shortcut(): string
    {
        try {
            $key = Setting::get('quick_log_shortcut');
        } catch (Throwable) {
            // Sem a tabela (banco ainda não migrado) o app abre com o padrão.
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
     * Troca a combinação: solta a anterior antes de registrar a nova, porque
     * o Electron não remove a antiga sozinho. Usado quando o usuário altera o atalho.
     */
    public static function replaceShortcut(string $previous, string $next): void
    {
        GlobalShortcut::key($previous)->unregister();
        self::registerShortcut($next);
    }
}
