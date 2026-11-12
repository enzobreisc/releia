<?php

namespace App\Http\Controllers;

use App\Services\UndoService;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;

class UndoController extends Controller
{
    public function __invoke(string $token, UndoService $undo): RedirectResponse
    {
        if ($undo->undo($token)) {
            Toast::success(__('Desfeito'));
        } else {
            Toast::error(__('Não dá mais para desfazer'), __('o prazo de :seconds s passou', ['seconds' => UndoService::TTL_SECONDS]));
        }

        return back();
    }
}
