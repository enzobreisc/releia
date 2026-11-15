<?php

namespace App\Http\Controllers;

use App\Http\Requests\SetBookPostureRequest;
use App\Models\Book;
use Illuminate\Http\RedirectResponse;

class BookPostureController extends Controller
{
    public function update(SetBookPostureRequest $request, Book $book): RedirectResponse
    {
        // `updated_at` versions the cover URL, so laying a book down must not make its cover download again.
        Book::withoutTimestamps(fn () => $book->update(['is_lying_down' => $request->boolean('is_lying_down')]));

        return back();
    }
}
