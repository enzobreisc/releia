<?php

namespace App\Http\Controllers;

use App\Models\ShoppingItem;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ShoppingCoverController extends Controller
{
    public function __invoke(ShoppingItem $shoppingItem): StreamedResponse
    {
        abort_if($shoppingItem->cover_path === null || ! Storage::disk('local')->exists($shoppingItem->cover_path), 404);

        return Storage::disk('local')->response($shoppingItem->cover_path, headers: [
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }
}
