<?php

namespace App\Http\Requests;

use App\Enums\ShelfGrouping;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OrganizeBookcaseRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'grouping' => ['required', Rule::enum(ShelfGrouping::class)],
            'shelves' => ['present', 'array'],
            'shelves.*.name' => ['required', 'string', 'max:'.InputLimits::NAME],
            'shelves.*.group_keys' => ['required', 'array', 'min:1'],
            'shelves.*.group_keys.*' => ['string'],
            'catch_all_name' => ['required', 'string', 'max:'.InputLimits::NAME],
        ];
    }
}
