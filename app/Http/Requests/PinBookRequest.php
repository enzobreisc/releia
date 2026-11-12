<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** The book to pin to the profile. */
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
