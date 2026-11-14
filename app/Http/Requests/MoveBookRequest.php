<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MoveBookRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'before_book_id' => ['nullable', 'integer', 'exists:books,id'],
        ];
    }
}
