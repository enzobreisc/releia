<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

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
