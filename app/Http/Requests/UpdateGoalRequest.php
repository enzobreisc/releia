<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** The year's book goal. */
class UpdateGoalRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'yearly_goal' => ['required', 'integer', 'between:1,999'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'yearly_goal.between' => __('A meta vai de 1 a 999 livros.'),
        ];
    }
}
