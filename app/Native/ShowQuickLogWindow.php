<?php

namespace App\Native;

use Native\Desktop\Facades\MenuBar;

class ShowQuickLogWindow
{
    public function handle(): void
    {
        MenuBar::show();
    }
}
