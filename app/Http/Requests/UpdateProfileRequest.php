<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** The reader's name and tagline. */
class UpdateProfileRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:'.InputLimits::NAME],
            'bio' => ['nullable', 'string', 'max:'.InputLimits::BIO],
        ];
    }
}
