import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { BookCover } from '@/components/book-cover';
import { cardClass } from '@/components/card';
import { Button } from '@/components/form';
import {
    DisplayTitle,
    PageHeader,
    SectionTitle,
} from '@/components/page-header';
import { SuggestionEditions } from '@/components/suggestion-editions';
import type { Choosing } from '@/components/suggestion-editions';
import { useTranslation } from '@/hooks/use-translation';
import { index as libraryIndex } from '@/routes/library';
import { accept, alreadyRead, dismiss, generate } from '@/routes/suggestions';
import type { Suggestion } from '@/types';

type SuggestionsProps = {
    suggestions: Suggestion[];
    hasSources: boolean;
};

type RequestOptions = {
    preserveScroll: boolean;
    onStart: () => void;
    onFinish: () => void;
};

export default function Suggestions({
    suggestions,
    hasSources,
}: SuggestionsProps) {
    const { t } = useTranslation();
    const [busy, setBusy] = useState(false);
    const [lead, ...rest] = suggestions;

    const options: RequestOptions = {
        preserveScroll: true,
        onStart: () => setBusy(true),
        onFinish: () => setBusy(false),
    };

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title={t('Sugestões')}
                description={t('Livros novos, sempre com o motivo')}
                actions={
                    <Button
                        variant="ghost"
                        disabled={busy || !hasSources}
                        onClick={() => router.visit(generate(), options)}
                    >
                        {busy ? t('Buscando…') : t('Buscar novas sugestões')}
                    </Button>
                }
            />

            {!hasSources && (
                <EmptyState>
                    {t(
                        'Avalie livros com 4 ou 5 estrelas para receber sugestões.',
                    )}{' '}
                    <Link
                        href={libraryIndex.url()}
                        className="text-link hover:underline"
                    >
                        {t('Ir para a biblioteca')}
                    </Link>
                </EmptyState>
            )}

            {hasSources && suggestions.length === 0 && (
                <EmptyState>
                    {t(
                        'Nenhuma sugestão no momento. Use "Buscar novas sugestões" para procurar mais.',
                    )}
                </EmptyState>
            )}

            {lead && (
                <LeadSuggestion
                    suggestion={lead}
                    disabled={busy}
                    options={options}
                />
            )}

            {rest.length > 0 && (
                <section
                    aria-labelledby="more-suggestions"
                    className="flex flex-col gap-3.5"
                >
                    <h2 id="more-suggestions">
                        <SectionTitle>
                            {t('Mais sugestões · :count', {
                                count: rest.length,
                            })}
                        </SectionTitle>
                    </h2>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(380px,100%),1fr))] gap-3.5">
                        {rest.map((suggestion) => (
                            <SuggestionCard
                                key={suggestion.id}
                                suggestion={suggestion}
                                disabled={busy}
                                options={options}
                            />
                        ))}
                    </div>
                </section>
            )}

            {hasSources && suggestions.length > 0 && (
                <div className="flex flex-col items-start gap-2 pb-4">
                    <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => router.visit(generate(), options)}
                    >
                        {busy ? t('Buscando…') : t('Buscar mais sugestões')}
                    </Button>
                    <span className="text-xs text-muted">
                        {t(
                            'Cada busca sorteia outros dos seus livros e lê novos resultados, e acrescenta à lista.',
                        )}
                    </span>
                </div>
            )}
        </div>
    );
}

function EmptyState({ children }: { children: ReactNode }) {
    return <p className={cardClass('p-5 text-sm text-muted')}>{children}</p>;
}

function useSuggestionChoice() {
    const [open, setOpen] = useState(false);
    const [choosing, setChoosing] = useState<Choosing | null>(null);

    return {
        open,
        choosing,
        toggle: () => setOpen(!open),
        choose: setChoosing,
        close: () => {
            setChoosing(null);
            setOpen(false);
        },
    };
}

type SuggestionProps = {
    suggestion: Suggestion;
    disabled: boolean;
    options: RequestOptions;
};

function EditionsToggle({
    open,
    onToggle,
}: {
    open: boolean;
    onToggle: () => void;
}) {
    const { t } = useTranslation();

    return (
        <button
            type="button"
            aria-expanded={open}
            onClick={onToggle}
            className="self-start text-[13px] font-bold text-link hover:underline"
        >
            {open ? t('− Esconder edições') : t('+ Escolher edição')}
        </button>
    );
}

function SuggestionActions({
    suggestion,
    disabled,
    options,
    onChoose,
    large = false,
}: SuggestionProps & {
    onChoose: (choice: Choosing) => void;
    large?: boolean;
}) {
    const { t } = useTranslation();
    const size = large ? 'h-12' : 'h-10';

    return (
        <div className="flex flex-wrap gap-2">
            <Button
                disabled={disabled}
                className={large ? 'h-12 px-6.5' : size}
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
                className={size}
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
                className={`${size} bg-transparent text-secondary inset-ring-0 hover:bg-elevated`}
                onClick={() => router.visit(dismiss(suggestion.id), options)}
            >
                {t('Sem interesse')}
            </Button>
        </div>
    );
}

function LeadSuggestion({ suggestion, disabled, options }: SuggestionProps) {
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
                    large
                />
            </div>
            {(choice.open || choice.choosing) && (
                <SuggestionEditions
                    key={choice.choosing ?? 'browse'}
                    id={suggestion.id}
                    disabled={disabled}
                    options={options}
                    mode={choice.choosing}
                    onCancel={choice.close}
                />
            )}
        </section>
    );
}

function SuggestionCard({ suggestion, disabled, options }: SuggestionProps) {
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
            {(choice.open || choice.choosing) && (
                <SuggestionEditions
                    key={choice.choosing ?? 'browse'}
                    id={suggestion.id}
                    disabled={disabled}
                    options={options}
                    mode={choice.choosing}
                    onCancel={choice.close}
                />
            )}
            <SuggestionActions
                suggestion={suggestion}
                disabled={disabled}
                options={options}
                onChoose={choice.choose}
            />
        </article>
    );
}
