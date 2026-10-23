<?php

namespace App\Http\Controllers;

use App\Models\Author;
use App\Services\AuthorPhoto\AuthorPhotoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuthorPhotoController extends Controller
{
    public function show(Author $author): StreamedResponse
    {
        abort_if($author->photo_path === null || ! Storage::disk('local')->exists($author->photo_path), 404);

        // The URL carries a version (?v=), so the photo can be cached for a long time.
        return Storage::disk('local')->response($author->photo_path, headers: [
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }

    /** Fetches the photo on first need; the author page asks for it separately, as it is network work. */
    public function lookUp(Author $author, AuthorPhotoService $photos): JsonResponse
    {
        $photos->ensurePhoto($author);

        return response()->json(['photo_url' => $author->fresh()?->photoUrl()]);
    }
}
