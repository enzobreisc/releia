<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveGoogleBooksKeyRequest extends FormRequest
{
    public const FIELD = 'google_books_key';

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            self::FIELD => ['required', 'string', 'between:'.InputLimits::API_KEY_MIN.','.InputLimits::API_KEY_MAX, 'regex:/^[A-Za-z0-9_\-.]+$/'],
        ];
    }

    public function key(): string
    {
        return $this->string(self::FIELD)->toString();
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $invalid = __('Essa chave não parece válida. Copie a chave inteira, sem espaços.');

        return [
            self::FIELD.'.required' => __('Cole a chave do Google Books.'),
            self::FIELD.'.between' => $invalid,
            self::FIELD.'.regex' => $invalid,
        ];
    }
}
