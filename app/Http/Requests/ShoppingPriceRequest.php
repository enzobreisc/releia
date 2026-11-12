<?php

namespace App\Http\Requests;

use App\Support\Money;
use Illuminate\Foundation\Http\FormRequest;

class ShoppingPriceRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'estimated_price' => ShoppingItemRequest::priceRule(),
        ];
    }

    /** An empty price clears the noted price. */
    public function cents(): ?int
    {
        return Money::parseReais($this->validated('estimated_price'));
    }
}
