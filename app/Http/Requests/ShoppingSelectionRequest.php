<?php

namespace App\Http\Requests;

use App\Models\ShoppingItem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ShoppingSelectionRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct', Rule::exists(ShoppingItem::class, 'id')],
        ];
    }

    /**
     * @return Collection<int, ShoppingItem>
     */
    public function shoppingItems(): Collection
    {
        /** @var list<int> $ids */
        $ids = $this->validated('ids');

        return ShoppingItem::query()->whereKey($ids)->orderBy('id')->get();
    }
}
