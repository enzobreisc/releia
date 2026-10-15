<?php

namespace App\Http\Requests;

use App\Enums\ReadingStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Estante, nota e resenha. Página atual e sessões entram na fase 2. */
class UpdateReadingRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['sometimes', Rule::enum(ReadingStatus::class)],
            'rating' => ['sometimes', 'nullable', 'integer', 'between:1,5'],
            'review' => ['sometimes', 'nullable', 'string', 'max:20000'],
        ];
    }
}
