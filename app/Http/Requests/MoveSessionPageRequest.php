<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MoveSessionPageRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'page' => ['required', 'integer', 'between:0,20000'],
        ];
    }
}
