<?php

namespace App\Events;

/**
 * Disparado pelo atalho global. O NativePHP chama o evento com a combinação
 * como argumento, por isso o construtor aceita (e ignora) o valor.
 */
class QuickLogShortcutPressed
{
    public function __construct(public string $shortcut = '') {}
}
