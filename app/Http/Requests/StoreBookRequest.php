<?php

namespace App\Http\Requests;

use App\Enums\BookSource;
use App\Enums\ReadingStatus;
use App\Support\Isbn;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBookRequest extends FormRequest
{
    /**
     * Normaliza antes de validar: ISBN sem hífens e autores separados por vírgula.
     */
    protected function prepareForValidation(): void
    {
        $isbn = $this->input('isbn_13');
        $isbn13 = is_string($isbn) && trim($isbn) !== '' ? (Isbn::toIsbn13($isbn) ?? $isbn) : null;

        $this->merge([
            'isbn_13' => $isbn13,
            // Derivado do ISBN-13, para os dois nunca divergirem.
            'isbn_10' => $isbn13 !== null ? Isbn::toIsbn10($isbn13) : null,
            'authors' => is_string($this->input('authors'))
                ? array_values(array_filter(array_map('trim', explode(',', $this->input('authors')))))
                : $this->input('authors', []),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'authors' => ['array'],
            'authors.*' => ['string', 'max:255'],
            'isbn_13' => [
                'nullable',
                'string',
                function (string $attribute, mixed $value, Closure $fail) {
                    if (! is_string($value) || Isbn::toIsbn13($value) === null) {
                        $fail('ISBN inválido.');
                    }
                },
                Rule::unique('books', 'isbn_13'),
            ],
            'isbn_10' => ['nullable', 'string', 'max:10'],
            'publisher' => ['nullable', 'string', 'max:255'],
            'published_year' => ['nullable', 'integer', 'between:1000,2100'],
            'pages' => ['nullable', 'integer', 'between:1,20000'],
            'genre' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:20000'],
            'cover_url' => ['nullable', 'url:http,https', 'max:2048'],
            'source' => ['nullable', Rule::enum(BookSource::class)],
            'status' => ['required', Rule::enum(ReadingStatus::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Informe o título.',
            'isbn_13.unique' => 'Esse livro já está na biblioteca.',
            'pages.between' => 'Número de páginas inválido.',
            'published_year.between' => 'Ano inválido.',
        ];
    }
}
