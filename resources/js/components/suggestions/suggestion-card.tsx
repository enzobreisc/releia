import { BookCover } from '@/components/book-cover';
import { cardClass } from '@/components/card';
import { useSuggestionChoice } from '@/hooks/use-suggestion-choice';
import type { RequestOptions } from '@/hooks/use-suggestion-requests';
import { useTranslation } from '@/hooks/use-translation';
import type { Suggestion } from '@/types';
import { EditionsToggle } from './editions-toggle';
import { SuggestionActions } from './suggestion-actions';
import { SuggestionEditionsPanel } from './suggestion-editions-panel';

export function SuggestionCard({
    suggestion,
    disabled,
    options,
}: {
    suggestion: Suggestion;
    disabled: boolean;
    options: RequestOptions;
}) {
    const { t } = useTranslation();
    const choice = useSuggestionChoice();

    return (
        <article className={cardClass('flex flex-col gap-3.5 p-4.5')}>
            <div className="flex gap-4">
                <BookCover
                    src={suggestion.cover_url}
                    title={suggestion.title}
                    className="w-16"
                />
                <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="text-[17px] font-extrabold">
                        {suggestion.title}
                    </h3>
                    {suggestion.authors && (
                        <p className="text-[13px] font-semibold text-secondary">
                            {suggestion.authors}
                        </p>
                    )}
                    <p className="text-[13px] leading-normal font-medium text-secondary">
                        {t('Por quê: :reason', { reason: suggestion.reason })}
                    </p>
                    <p className="text-xs font-medium text-muted">
                        {t('Parecido com: :book', {
                            book: suggestion.based_on,
                        })}
                    </p>
                </div>
            </div>
            {suggestion.has_editions && (
                <EditionsToggle open={choice.open} onToggle={choice.toggle} />
            )}
            <SuggestionEditionsPanel
                id={suggestion.id}
                disabled={disabled}
                options={options}
                choice={choice}
            />
            <SuggestionActions
                suggestion={suggestion}
                disabled={disabled}
                options={options}
                onChoose={choice.choose}
            />
        </article>
    );
}
