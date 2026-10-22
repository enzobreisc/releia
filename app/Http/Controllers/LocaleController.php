<?php

namespace App\Http\Controllers;

use App\Enums\Locale;
use App\Http\Requests\UpdateLocaleRequest;
use App\Models\Setting;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;

class LocaleController extends Controller
{
    public function update(UpdateLocaleRequest $request): RedirectResponse
    {
        $locale = Locale::from($request->string('locale')->toString());

        Setting::put(Locale::SETTING, $locale->value);
        app()->setLocale($locale->value);

        Toast::success(__('Idioma alterado'), $locale->nativeName());

        return back();
    }
}
