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
                        $fail(__('ISBN inválido.'));
                    }
                },
            ],
            // Cover of the match picked in the search.
            'cover_url' => ['nullable', 'url:http,https', 'max:2048'],
            // Link of a specific listing; an Amazon link also yields the ISBN.
            'url' => ['nullable', 'url:http,https', 'max:2048'],
            'store_type' => ['required', Rule::enum(StoreType::class)],
            'estimated_price' => self::priceRule(),
        ];
    }

    /**
     * Price typed in reais ("34,90"); the conversion to cents happens in payload().
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
                    $fail(__('Preço inválido. Use o formato 34,90.'));
                }
            },
        ];
    }

    /**
     * Data ready for ShoppingService: 13-digit ISBN (typed or taken
     * from the Amazon link) and price in cents, with the date it was noted.
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
