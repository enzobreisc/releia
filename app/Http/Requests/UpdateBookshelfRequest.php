<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** The new name of an existing bookcase shelf. */
class UpdateBookshelfRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:'.InputLimits::NAME],
        ];
    }
}
