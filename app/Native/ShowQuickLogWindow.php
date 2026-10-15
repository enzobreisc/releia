<?php

namespace App\Native;

use Native\Desktop\Facades\MenuBar;

/** Abre a janela da barra de menu quando o atalho global é pressionado. */
class ShowQuickLogWindow
{
    public function handle(): void
    {
        MenuBar::show();
    }
}
