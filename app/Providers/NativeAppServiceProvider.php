<?php

namespace App\Providers;

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

        // Fase 2: MenuBar::create() com public/menubar/releiaTemplate.png
        // e GlobalShortcut configurável para o registro rápido.
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
