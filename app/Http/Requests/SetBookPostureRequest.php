<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SetBookPostureRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'is_lying_down' => ['required', 'boolean'],
        ];
    }
}
