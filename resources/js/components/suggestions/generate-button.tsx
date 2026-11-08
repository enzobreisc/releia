import { router } from '@inertiajs/react';
import { Button } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import type { RequestOptions } from '@/hooks/use-suggestion-requests';
import type { TranslationKey } from '@/lib/i18n';
import { generate } from '@/routes/suggestions';

export function GenerateButton({
    label,
    isBusy,
    isDisabled = isBusy,
    options,
}: {
    label: TranslationKey;
    isBusy: boolean;
    isDisabled?: boolean;
    options: RequestOptions;
}) {
    const { t } = useTranslation();

    return (
        <Button
            variant="ghost"
            disabled={isDisabled}
            onClick={() => router.visit(generate(), options)}
        >
            {isBusy ? t('Buscando…') : t(label)}
        </Button>
    );
}
