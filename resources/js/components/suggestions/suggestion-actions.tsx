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
}: {
    suggestion: Suggestion;
    disabled: boolean;
    options: RequestOptions;
    onChoose: (choice: Choosing) => void;
}) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-wrap gap-2">
            <Button
                disabled={disabled}
                className="h-10"
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
                className="h-10"
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
                className="h-10 bg-transparent text-secondary inset-ring-0 hover:bg-elevated"
                onClick={() => router.visit(dismiss(suggestion.id), options)}
            >
                {t('Sem interesse')}
            </Button>
        </div>
    );
}
