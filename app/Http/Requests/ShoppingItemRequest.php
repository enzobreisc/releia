<?php

namespace App\Http\Requests;

use App\Enums\StoreType;
use App\Support\AmazonLink;
use App\Support\Isbn;
use App\Support\Money;
use Carbon\CarbonInterface;
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
            // Capa da correspondência escolhida na busca.
            'cover_url' => ['nullable', 'url:http,https', 'max:2048'],
            // Link de um anúncio específico; de um link da Amazon também sai o ISBN.
            'url' => ['nullable', 'url:http,https', 'max:2048'],
            'store_type' => ['required', Rule::enum(StoreType::class)],
            'estimated_price' => self::priceRule(),
        ];
    }

    /**
     * Preço digitado em reais ("34,90"); a conversão para centavos fica em payload().
     *
     * @return list<mixed>
     */
    public static function priceRule(): array
    {
        return [
            'nullable',
            'string',
            function (string $attribute, mixed $value, Closure $fail) {
                if (is_string($value) && trim($value) !== '' && Money::parseReais($value) === null) {
                    $fail('Preço inválido. Use o formato 34,90.');
                }
            },
        ];
    }

    /**
     * Dados prontos para o ShoppingService: ISBN em 13 dígitos (digitado ou tirado
     * do link da Amazon) e preço em centavos, com a data em que foi anotado.
     *
     * @return array{title: string, author: string, isbn: string|null, cover_url: string|null, url: string|null, store_type: string, estimated_price_cents: int|null, price_checked_at: CarbonInterface|null}
     */
    public function payload(): array
    {
        $data = $this->validated();
        $isbn = trim((string) ($data['isbn'] ?? ''));
        $url = trim((string) ($data['url'] ?? '')) ?: null;
        $price = Money::parseReais($data['estimated_price'] ?? null);

        return [
            'title' => $data['title'],
            'author' => trim((string) ($data['author'] ?? '')),
            'isbn' => $isbn !== '' ? Isbn::toIsbn13($isbn) : ($url === null ? null : AmazonLink::isbnFromUrl($url)),
            'cover_url' => $data['cover_url'] ?? null,
            'url' => $url,
            'store_type' => $data['store_type'],
            'estimated_price_cents' => $price,
            'price_checked_at' => $price === null ? null : now(),
        ];
    }
}
