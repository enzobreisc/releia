<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Ending the live session, optionally finishing the book as well. */
class FinishLiveSessionRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'finish_book' => ['sometimes', 'boolean'],
        ];
    }
}
