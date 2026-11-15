<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveBookshelfRequest extends FormRequest
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

    public function shelfName(): string
    {
        return trim($this->string('name')->toString());
    }
}
