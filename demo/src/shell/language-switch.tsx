import { router, usePage } from '@inertiajs/react';
import type { Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { update as updateLocale } from '@/routes/locale';
import { LOCALES } from './constants';
import { useShellCopy } from './use-shell-copy';

const LOCALE_LABELS: Record<Locale, string> = { pt_BR: 'PT', en: 'EN' };

export function LanguageToggle({
    value,
    onChange,
}: {
    value: Locale;
    onChange: (locale: Locale) => void;
}) {
    const label = useShellCopy().topBar.language;

    return (
        <div
            role="group"
            aria-label={label}
            className="inline-flex rounded-full border border-border bg-surface p-1"
        >
            {LOCALES.map((code) => (
                <button
                    key={code}
                    type="button"
                    aria-pressed={code === value}
                    onClick={() => onChange(code)}
                    className={cn(
                        'h-8 min-w-11 rounded-full px-3.5 text-[13px] font-bold',
                        code === value
                            ? 'bg-text text-bg'
                            : 'text-secondary hover:text-text',
                    )}
                >
                    {LOCALE_LABELS[code]}
                </button>
            ))}
        </div>
    );
}

/** Switches the app's locale on the server, so every page re-renders in the new language. */
export function LanguageSwitch() {
    const { locale } = usePage().props;

    const switchTo = (next: Locale) => {
        if (next === locale) {
            return;
        }

        router.put(
            updateLocale.url(),
            { locale: next },
            { preserveScroll: true },
        );
    };

    return <LanguageToggle value={locale} onChange={switchTo} />;
}
