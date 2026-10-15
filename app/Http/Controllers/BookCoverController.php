<?php

namespace App\Http\Controllers;

use App\Models\Book;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BookCoverController extends Controller
{
    public function __invoke(Book $book): StreamedResponse
    {
        abort_if($book->cover_path === null || ! Storage::disk('local')->exists($book->cover_path), 404);

        // A URL leva a versão (?v=), então a capa pode ficar em cache por muito tempo.
        return Storage::disk('local')->response($book->cover_path, headers: [
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }
}
