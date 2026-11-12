import { router } from '@inertiajs/react';
import { Field, Select } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { update as updateLocale } from '@/routes/locale';
import type { Option } from '@/types';

export function LocaleSelect({ locales }: { locales: Option[] }) {
    const { t, locale } = useTranslation();

    return (
        <Field label={t('Idioma')}>
            <Select
                value={locale}
                onChange={(event) =>
                    router.put(
                        updateLocale.url(),
                        { locale: event.target.value },
                        { preserveScroll: true },
                    )
                }
            >
                {locales.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </Select>
        </Field>
    );
}
