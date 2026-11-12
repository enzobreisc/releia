<?php

namespace App\Providers;

use App\Native\QuickLog;
use Native\Desktop\Contracts\ProvidesPhpIni;
use Native\Desktop\Facades\Window;

class NativeAppServiceProvider implements ProvidesPhpIni
{
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

        QuickLog::install();
    }

    /**
     * @return array<string, string>
     */
    public function phpIni(): array
    {
        return [
        ];
    }
}
