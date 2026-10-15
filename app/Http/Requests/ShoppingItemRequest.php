<?php

namespace App\Http\Requests;

use App\Enums\StoreType;
use App\Support\Isbn;
use App\Support\Money;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ShoppingItemRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'author' => ['nullable', 'string', 'max:255'],
            'isbn' => [
                'nullable',
                'string',
                function (string $attribute, mixed $value, Closure $fail) {
                    if (is_string($value) && trim($value) !== '' && Isbn::toIsbn13($value) === null) {
                        $fail('ISBN inválido.');
                    }
                },
            ],
            'store_type' => ['required', Rule::enum(StoreType::class)],
            // Digitado em reais ("34,90"); a conversão para centavos fica em payload().
            'estimated_price' => [
                'nullable',
                'string',
                function (string $attribute, mixed $value, Closure $fail) {
                    if (is_string($value) && trim($value) !== '' && Money::parseReais($value) === null) {
                        $fail('Preço inválido. Use o formato 34,90.');
                    }
                },
            ],
        ];
    }

    /**
     * Dados prontos para o ShoppingService: ISBN em 13 dígitos e preço em centavos.
     *
     * @return array{title: string, author: string, isbn: string|null, store_type: string, estimated_price_cents: int|null}
     */
    public function payload(): array
    {
        $data = $this->validated();
        $isbn = trim((string) ($data['isbn'] ?? ''));

        return [
            'title' => $data['title'],
            'author' => trim((string) ($data['author'] ?? '')),
            'isbn' => $isbn === '' ? null : Isbn::toIsbn13($isbn),
            'store_type' => $data['store_type'],
            'estimated_price_cents' => Money::parseReais($data['estimated_price'] ?? null),
        ];
    }
}
