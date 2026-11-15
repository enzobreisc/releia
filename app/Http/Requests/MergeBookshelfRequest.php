<?php

namespace App\Http\Requests;

use App\Models\Bookshelf;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MergeBookshelfRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Bookshelf $kept */
        $kept = $this->route('bookshelf');

        return [
            'absorbed_id' => ['required', 'integer', Rule::exists('bookshelves', 'id'), Rule::notIn([$kept->id])],
        ];
    }
}
