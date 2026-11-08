import { router } from '@inertiajs/react';
import { Button } from '@/components/form';
import type { Choosing } from '@/components/suggestion-editions';
import { useTranslation } from '@/hooks/use-translation';
import type { RequestOptions } from '@/hooks/use-suggestion-requests';
import { accept, alreadyRead, dismiss } from '@/routes/suggestions';
import type { Suggestion } from '@/types';

export function SuggestionActions({
    suggestion,
    disabled,
    options,
    onChoose,
    isLarge = false,
}: {
    suggestion: Suggestion;
    disabled: boolean;
    options: RequestOptions;
    onChoose: (choice: Choosing) => void;
    isLarge?: boolean;
}) {
    const { t } = useTranslation();
    const height = isLarge ? 'h-12' : 'h-10';

    return (
        <div className="flex flex-wrap gap-2">
            <Button
                disabled={disabled}
                className={isLarge ? 'h-12 px-6.5' : height}
                onClick={() =>
                    suggestion.has_editions
                        ? onChoose('want')
                        : router.visit(accept(suggestion.id), options)
                }
            >
                {t('Quero ler')}
            </Button>
            <Button
                variant="ghost"
                disabled={disabled}
                className={height}
                onClick={() =>
                    suggestion.has_editions
                        ? onChoose('read')
                        : router.visit(alreadyRead(suggestion.id), options)
                }
            >
                {t('Já li')}
            </Button>
            <Button
                variant="ghost"
                disabled={disabled}
                className={`${height} bg-transparent text-secondary inset-ring-0 hover:bg-elevated`}
                onClick={() => router.visit(dismiss(suggestion.id), options)}
            >
                {t('Sem interesse')}
            </Button>
        </div>
    );
}
