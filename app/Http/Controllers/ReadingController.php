<?php

namespace App\Http\Controllers;

use App\Enums\ReadingStatus;
use App\Http\Requests\UpdateReadingRequest;
use App\Models\Book;
use App\Models\Reading;
use App\Services\ReadingService;
use Illuminate\Http\RedirectResponse;

class ReadingController extends Controller
{
    public function __construct(private readonly ReadingService $readings) {}

    /** Atualiza a leitura mais recente do livro. */
    public function update(UpdateReadingRequest $request, Book $book): RedirectResponse
    {
        $reading = $book->currentReading;

        if ($reading === null) {
            $reading = new Reading(['status' => ReadingStatus::WantToRead]);
            $reading->book()->associate($book);
        }

        if ($request->has('rating')) {
            $reading->rating = $request->integer('rating') ?: null;
        }

        if ($request->has('review')) {
            $review = trim((string) $request->string('review'));
            $reading->review = $review === '' ? null : $review;
        }

        if ($request->has('status')) {
            $this->readings->changeStatus($reading, $request->enum('status', ReadingStatus::class) ?? $reading->status);
        } else {
            $reading->save();
        }

        return back();
    }
}
