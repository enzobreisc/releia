<?php

namespace App\Http\Middleware;

use App\Enums\Locale;
use App\Models\Setting;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $locale = self::current();

        app()->setLocale($locale->value);
        Carbon::setLocale($locale->value);

        return $next($request);
    }

    public static function current(): Locale
    {
        $stored = Setting::get(Locale::SETTING);

        return (is_string($stored) ? Locale::tryFrom($stored) : null)
            ?? Locale::from(config('app.locale'));
    }
}
