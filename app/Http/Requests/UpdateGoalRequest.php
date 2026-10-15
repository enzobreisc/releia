<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Meta de livros do ano. */
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
            'yearly_goal.between' => 'A meta vai de 1 a 999 livros.',
        ];
    }
}
