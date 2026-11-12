<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PinBookRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'book_id' => ['required', 'integer', 'exists:books,id'],
        ];
    }
}
