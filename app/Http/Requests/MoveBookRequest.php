<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Where a book goes on the bookcase: a shelf (or none) and an optional book to sit before. */
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
