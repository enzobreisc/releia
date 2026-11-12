<?php

namespace App\Events;

/**
 * NativePHP passes the key combination as an argument, so the constructor must accept it.
 */
class QuickLogShortcutPressed
{
    public function __construct(public string $shortcut = '') {}
}
