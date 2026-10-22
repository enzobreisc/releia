<?php

use App\Enums\Locale;
use App\Enums\NoteKind;
use App\Enums\ReadingStatus;
use App\Models\Setting;
use App\Support\Money;
use App\Support\Ordinal;

it('defaults to Brazilian Portuguese', function () {
    $this->get('/')->assertInertia(fn ($page) => $page
        ->where('locale', 'pt_BR')
        ->where('language_tag', 'pt-BR'));
});

it('persists the chosen language and applies it to later requests', function () {
    $this->put(route('locale.update'), ['locale' => 'en'])->assertRedirect();

    expect(Setting::get(Locale::SETTING))->toBe('en');

    $this->get('/')->assertInertia(fn ($page) => $page
        ->where('locale', 'en')
        ->where('language_tag', 'en-US'));
});

it('rejects an unsupported language', function () {
    $this->put(route('locale.update'), ['locale' => 'fr'])->assertSessionHasErrors('locale');

    expect(session('errors')->first('locale'))->not->toStartWith('validation.');

    expect(Setting::get(Locale::SETTING))->toBeNull();
});

it('translates server notices to the chosen language', function () {
    Setting::put(Locale::SETTING, 'en');

    $this->put(route('goal.update'), ['yearly_goal' => 20])
        ->assertSessionHas('toast.title', 'Goal saved')
        ->assertSessionHas('toast.sub', '20 books in '.now()->year);
});

it('keeps Portuguese notices when the language is Portuguese', function () {
    $this->put(route('goal.update'), ['yearly_goal' => 20])
        ->assertSessionHas('toast.title', 'Meta salva');
});

it('formats money and ordinals for the current language', function () {
    expect(Money::format(123456))->toBe('R$ 1.234,56')
        ->and(Ordinal::masculine(2))->toBe('2º')
        ->and(Ordinal::feminine(2))->toBe('2ª');

    app()->setLocale('en');

    expect(Money::format(123456))->toBe('R$ 1,234.56')
        ->and(Ordinal::masculine(2))->toBe('2nd')
        ->and(Ordinal::feminine(3))->toBe('3rd');
});

it('translates enum labels and shared lists to English', function () {
    app()->setLocale('en');

    expect(ReadingStatus::WantToRead->label())->toBe('Want to read')
        ->and(ReadingStatus::Read->shelfLabel())->toBe('Read')
        ->and(NoteKind::Quote->pluralLabel())->toBe('Quotes');
});

it('lists the available languages on the profile page', function () {
    $this->get(route('profile.show'))->assertInertia(fn ($page) => $page
        ->where('locales', [
            ['value' => 'pt_BR', 'label' => 'Português (Brasil)'],
            ['value' => 'en', 'label' => 'English'],
        ]));
});

it('has an English translation for every literal key used on the server', function () {
    $translations = json_decode((string) file_get_contents(lang_path('en.json')), true);
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(app_path()));
    $missing = [];

    foreach ($files as $file) {
        if ($file->getExtension() !== 'php') {
            continue;
        }

        preg_match_all('/\b(?:__|trans)\(\s*(\'(?:[^\'\\\\]|\\\\.)*\'|"(?:[^"\\\\]|\\\\.)*")/', (string) file_get_contents($file->getPathname()), $matches);

        foreach ($matches[1] as $literal) {
            $key = stripcslashes(substr($literal, 1, -1));

            if (! array_key_exists($key, $translations)) {
                $missing[] = $key;
            }
        }
    }

    expect($missing)->toBe([]);
});
