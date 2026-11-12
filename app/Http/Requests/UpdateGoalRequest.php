<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGoalRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'yearly_goal' => ['required', 'integer', 'between:1,999'],
            'daily_goal' => ['nullable', 'integer', 'between:1,2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'yearly_goal.between' => __('A meta vai de 1 a 999 livros.'),
            'daily_goal.between' => __('A meta diária vai de 1 a 2000 páginas.'),
        ];
    }
}
