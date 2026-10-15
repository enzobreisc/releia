<?php

namespace App\Providers;

use App\Native\QuickLog;
use Native\Desktop\Contracts\ProvidesPhpIni;
use Native\Desktop\Facades\Window;

class NativeAppServiceProvider implements ProvidesPhpIni
{
    /**
     * Executed once the native application has been booted.
     * Use this method to open windows, register global shortcuts, etc.
     */
    public function boot(): void
    {
        Window::open()
            ->title('releia')
            ->width(1280)
            ->height(820)
            ->minWidth(960)
            ->minHeight(640)
            ->titleBarHiddenInset()
            ->rememberState();

        // Ícone da barra de menu e atalho global do registro rápido (app/Native/QuickLog.php).
        QuickLog::install();
    }

    /**
     * Return an array of php.ini directives to be set.
     *
     * @return array<string, string>
     */
    public function phpIni(): array
    {
        return [
        ];
    }
}
