<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

/** Quick log: today's session for a book picked in the menu bar window. */
class QuickLogRequest extends StoreSessionRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'book_id' => ['required', Rule::exists('books', 'id')],
            ...parent::rules(),
        ];
    }
}
