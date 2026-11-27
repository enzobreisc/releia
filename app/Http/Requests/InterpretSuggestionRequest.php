<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InterpretSuggestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['text' => ['required', 'string', 'max:'.InputLimits::SUGGESTION_TEXT]];
    }

    public function text(): string
    {
        return $this->string('text')->toString();
    }
}
