<?php

namespace App\Http\Requests;

use App\Http\Presenters\ReadingPresenter;
use App\Models\Book;
use App\Models\ReadingSession;
use App\Services\ReadingService;
use App\Support\Isbn;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Validator;

/**
 * Edição dos dados do livro. Além das regras de formato, duas checagens que
 * dependem do que já existe: o ISBN não pode ser de outro livro e o total de
 * páginas não pode ficar abaixo de uma sessão já registrada.
 */
class UpdateBookRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $isbn = $this->input('isbn_13');
        $isbn13 = is_string($isbn) && trim($isbn) !== '' ? (Isbn::toIsbn13($isbn) ?? $isbn) : null;
        $authors = $this->input('authors', []);

        $this->merge([
            'isbn_13' => $isbn13,
            'isbn_10' => $isbn13 !== null ? Isbn::toIsbn10($isbn13) : null,
            'authors' => is_string($authors)
                ? array_values(array_filter(array_map('trim', explode(',', $authors))))
                : (is_array($authors) ? array_values(array_filter(array_map(fn ($name) => trim((string) $name), $authors))) : []),
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
            'isbn_13' => ['nullable', 'string'],
            'isbn_10' => ['nullable', 'string', 'max:10'],
            'publisher' => ['nullable', 'string', 'max:255'],
            'published_year' => ['nullable', 'integer', 'between:1450,'.(Carbon::today()->year + 1)],
            'pages' => ['nullable', 'integer', 'between:1,20000'],
            'genre' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:20000'],
            'cover_url' => ['nullable', 'url:http,https', 'max:2048'],
            'cover_file' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Informe o título.',
            'pages.between' => 'Número de páginas inválido.',
            'published_year.between' => 'Use um ano entre 1450 e '.(Carbon::today()->year + 1).'.',
            'cover_file.image' => 'Escolha uma imagem (JPG, PNG, WebP ou GIF).',
            'cover_file.max' => 'A imagem pode ter até 5 MB.',
        ];
    }

    /**
     * @return list<Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                /** @var Book $book */
                $book = $this->route('book');
                $isbn = $this->input('isbn_13');

                if (is_string($isbn)) {
                    if (Isbn::toIsbn13($isbn) === null) {
                        $validator->errors()->add('isbn_13', 'ISBN inválido.');
                    } else {
                        $other = Book::query()->where('isbn_13', $isbn)->whereKeyNot($book->id)->first();

                        if ($other !== null) {
                            $edition = implode(', ', array_filter([$other->publisher, $other->published_year]));
                            $validator->errors()->add('isbn_13', "Esse ISBN já é de outro livro da biblioteca: {$other->title}".($edition === '' ? '' : " ({$edition})").'.');
                            // A tela usa o id para o link "Abrir o outro livro".
                            $validator->errors()->add('isbn_13_book', (string) $other->id);
                        }
                    }
                }

                $pages = $this->input('pages');

                if ($pages !== null && $pages !== '' && is_numeric($pages)) {
                    $highest = ReadingSession::query()
                        ->whereIn('reading_id', $book->readings()->select('id'))
                        ->orderByDesc('page_to')
                        ->first();

                    if ($highest !== null && $highest->page_to > (int) $pages) {
                        $hash = ReadingPresenter::session($highest)['hash'];
                        $validator->errors()->add(
                            'pages',
                            "O livro não pode ter menos que {$highest->page_to} páginas: a sessão {$hash} de ".ReadingService::shortDate($highest->read_on)." vai até a p. {$highest->page_to}.",
                        );
                        $validator->errors()->add('pages_session', (string) $highest->id);
                    }
                }
            },
        ];
    }
}
