<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Correction of an already logged session. */
class UpdateSessionRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'read_on' => ['required', 'date_format:Y-m-d'],
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
            'read_on.required' => 'Informe a data.',
            'page_to.required' => __('Informe a página.'),
            'page_to.between' => __('Número de página inválido.'),
            'minutes.between' => __('Informe entre 1 e 1440 minutos.'),
        ];
    }
}
