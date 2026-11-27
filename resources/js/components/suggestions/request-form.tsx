import type { FormEvent, Ref } from 'react';
import { Button, Input } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { SUGGESTION_TEXT_MAX_LENGTH } from './request-constants';

export function SuggestionRequestForm({
    text,
    fieldRef,
    isFieldDisabled,
    isSubmitDisabled,
    onTextChange,
    onSubmit,
}: {
    text: string;
    fieldRef: Ref<HTMLInputElement>;
    isFieldDisabled: boolean;
    isSubmitDisabled: boolean;
    onTextChange: (text: string) => void;
    onSubmit: (event: FormEvent) => void;
}) {
    const { t } = useTranslation();

    return (
        <form onSubmit={onSubmit} className="flex items-center gap-2">
            <Input
                ref={fieldRef}
                type="text"
                value={text}
                maxLength={SUGGESTION_TEXT_MAX_LENGTH}
                onChange={(event) => onTextChange(event.target.value)}
                placeholder={t('Ex.: mais do Dostoiévski, mas curto')}
                aria-label={t('Peça uma sugestão')}
                disabled={isFieldDisabled}
                className="h-13 min-w-0 flex-1 px-5 text-[15px]"
            />
            <Button
                type="submit"
                disabled={isSubmitDisabled}
                className="h-13 px-5 whitespace-nowrap"
            >
                {t('Pedir')}
            </Button>
        </form>
    );
}
