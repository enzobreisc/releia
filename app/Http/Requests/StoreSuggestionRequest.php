<?php

namespace App\Http\Requests;

use App\Services\Recommendation\SuggestionRequest;
use Illuminate\Foundation\Http\FormRequest;

class StoreSuggestionRequest extends FormRequest
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
        return [
            'text' => ['required', 'string', 'max:'.InputLimits::SUGGESTION_TEXT],
            'authors' => ['nullable', 'array', 'max:'.InputLimits::SUGGESTION_AUTHORS],
            'authors.*' => ['string', 'max:'.InputLimits::SUGGESTION_AUTHOR_NAME],
            'excluded_authors' => ['nullable', 'array', 'max:'.InputLimits::SUGGESTION_AUTHORS],
            'excluded_authors.*' => ['string', 'max:'.InputLimits::SUGGESTION_AUTHOR_NAME],
            'max_pages' => ['nullable', 'integer', 'between:1,'.InputLimits::SUGGESTION_PAGES],
        ];
    }

    public function suggestionRequest(): SuggestionRequest
    {
        $validated = $this->validated();

        return new SuggestionRequest(
            text: $validated['text'],
            authors: $validated['authors'] ?? [],
            excludedAuthors: $validated['excluded_authors'] ?? [],
            maxPages: $validated['max_pages'] ?? null,
        );
    }
}
