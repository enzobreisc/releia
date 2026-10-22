<?php

namespace App\Http\Requests;

use App\Http\Presenters\ReadingPresenter;
use App\Models\Book;
use App\Models\ReadingSession;
use App\Support\DateLabel;
use App\Support\Isbn;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Validator;

/**
 * Editing the book's data. Besides the format rules, two checks that
 * depend on what already exists: the ISBN cannot belong to another book and the total
 * pages cannot fall below an already logged session.
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
            'title.required' => __('Informe o título.'),
            'pages.between' => __('Número de páginas inválido.'),
            'published_year.between' => __('Use um ano entre 1450 e :year.', ['year' => Carbon::today()->year + 1]),
            'cover_file.image' => __('Escolha uma imagem (JPG, PNG, WebP ou GIF).'),
            'cover_file.max' => __('A imagem pode ter até 5 MB.'),
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
                        $validator->errors()->add('isbn_13', __('ISBN inválido.'));
                    } else {
                        $other = Book::query()->where('isbn_13', $isbn)->whereKeyNot($book->id)->first();

                        if ($other !== null) {
                            $edition = implode(', ', array_filter([$other->publisher, $other->published_year]));
                            $validator->errors()->add('isbn_13', __('Esse ISBN já é de outro livro da biblioteca: :book.', ['book' => $other->title.($edition === '' ? '' : " ({$edition})")]));
                            // The screen uses the id for the "Open the other book" link.
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
                            __('O livro não pode ter menos que :pages páginas: a sessão :hash de :date vai até a p. :pages.', ['pages' => $highest->page_to, 'hash' => $hash, 'date' => DateLabel::shortDate($highest->read_on)]),
                        );
                        $validator->errors()->add('pages_session', (string) $highest->id);
                    }
                }
            },
        ];
    }
}
