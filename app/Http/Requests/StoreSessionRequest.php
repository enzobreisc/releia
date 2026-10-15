<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Página em que você parou e minutos opcionais. A data é sempre hoje. */
class StoreSessionRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'page_to' => ['required', 'integer', 'between:1,20000'],
            'minutes' => ['nullable', 'integer', 'between:1,1440'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'page_to.required' => 'Informe a página atual.',
            'page_to.between' => 'Número de página inválido.',
            'minutes.between' => 'Informe entre 1 e 1440 minutos.',
        ];
    }
}
