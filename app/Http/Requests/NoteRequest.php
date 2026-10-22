<?php

namespace App\Http\Requests;

use App\Enums\NoteKind;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Create and edit a note: the same set of fields in both cases. */
class NoteRequest extends FormRequest
{
    /**
     * A blank page becomes null, so it does not fail numeric validation.
     */
    protected function prepareForValidation(): void
    {
        $page = $this->input('page');

        if (is_string($page) && trim($page) === '') {
            $this->merge(['page' => null]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'book_id' => ['required', 'integer', 'exists:books,id'],
            'kind' => ['required', Rule::enum(NoteKind::class)],
            'page' => ['nullable', 'integer', 'between:1,100000'],
            'body_md' => ['required', 'string', 'max:20000'],
        ];
    }

    /**
     * @return array{book_id: int, page: int|null, kind: string, body_md: string}
     */
    public function payload(): array
    {
        $data = $this->validated();

        return [
            'book_id' => (int) $data['book_id'],
            'page' => $data['page'] === null ? null : (int) $data['page'],
            'kind' => (string) $data['kind'],
            'body_md' => (string) $data['body_md'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'body_md.required' => __('Escreva o texto da nota.'),
            'book_id.required' => 'Escolha o livro.',
            'book_id.exists' => __('Livro não encontrado.'),
            'page.between' => __('Número de página inválido.'),
        ];
    }
}
