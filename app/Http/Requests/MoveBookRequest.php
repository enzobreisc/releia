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
            'bookshelf_id' => ['nullable', 'integer', 'exists:bookshelves,id'],
            'before_book_id' => ['nullable', 'integer', 'exists:books,id'],
        ];
    }
}
