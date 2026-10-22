<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** The page where you stopped and optional minutes. The date is always today. */
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
            'page_to.required' => __('Informe a página atual.'),
            'page_to.between' => __('Número de página inválido.'),
            'minutes.between' => __('Informe entre 1 e 1440 minutos.'),
        ];
    }
}
