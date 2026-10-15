<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

/** Registro rápido: a sessão de hoje para um livro escolhido na janela da barra de menu. */
class QuickLogRequest extends StoreSessionRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'book_id' => ['required', Rule::exists('books', 'id')],
            ...parent::rules(),
        ];
    }
}
