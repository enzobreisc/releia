<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveGoogleBooksKeyRequest;
use App\Services\BookLookup\GoogleBooksKey;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;

class GoogleBooksKeyController extends Controller
{
    public function __construct(private readonly GoogleBooksKey $key) {}

    public function update(SaveGoogleBooksKeyRequest $request): RedirectResponse
    {
        $this->key->save($request->key());

        Toast::success(__('Chave do Google Books salva'));

        return back();
    }

    public function destroy(): RedirectResponse
    {
        $this->key->forget();

        Toast::success(__('Chave do Google Books removida'));

        return back();
    }
}
