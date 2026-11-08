import { BookCover } from '@/components/book-cover';
import { DisplayTitle, SectionTitle } from '@/components/page-header';
import { useSuggestionChoice } from '@/hooks/use-suggestion-choice';
import type { RequestOptions } from '@/hooks/use-suggestion-requests';
import { useTranslation } from '@/hooks/use-translation';
import type { Suggestion } from '@/types';
import { EditionsToggle } from './editions-toggle';
import { SuggestionActions } from './suggestion-actions';
import { SuggestionEditionsPanel } from './suggestion-editions-panel';

export function LeadSuggestion({
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
        <section
            aria-label={t('Melhor sugestão agora')}
            className="flex flex-wrap items-end gap-10"
        >
            <BookCover
                src={suggestion.cover_url}
                title={suggestion.title}
                className="w-45 shadow-hero"
            />
            <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-3.5 pb-1">
                <SectionTitle>{t('Melhor sugestão agora')}</SectionTitle>
                <DisplayTitle>{suggestion.title}</DisplayTitle>
                {suggestion.authors && (
                    <p className="text-[17px] font-semibold text-secondary">
                        {suggestion.authors}
                    </p>
                )}
                <p className="max-w-[58ch] text-base leading-relaxed font-semibold">
                    {t('Por quê: :reason', { reason: suggestion.reason })}
                </p>
                <p className="text-[13px] font-semibold text-muted">
                    {t('Parecido com: :book', { book: suggestion.based_on })}
                </p>
                {suggestion.has_editions && (
                    <EditionsToggle
                        open={choice.open}
                        onToggle={choice.toggle}
                    />
                )}
                <SuggestionActions
                    suggestion={suggestion}
                    disabled={disabled}
                    options={options}
                    onChoose={choice.choose}
                    isLarge
                />
            </div>
            <SuggestionEditionsPanel
                id={suggestion.id}
                disabled={disabled}
                options={options}
                choice={choice}
            />
        </section>
    );
}
