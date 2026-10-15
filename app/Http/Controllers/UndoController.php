<?php

namespace App\Http\Controllers;

use App\Services\UndoService;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;

/** Botão "Desfazer" dos avisos e ⌘Z. */
class UndoController extends Controller
{
    public function __invoke(string $token, UndoService $undo): RedirectResponse
    {
        if ($undo->undo($token)) {
            Toast::success('Desfeito');
        } else {
            Toast::error('Não dá mais para desfazer', 'o prazo de '.UndoService::TTL_SECONDS.' s passou');
        }

        return back();
    }
}
