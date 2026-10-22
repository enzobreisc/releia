import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { BookCover } from '@/components/book-cover';
import { Button } from '@/components/form';
import { SuggestionEditions } from '@/components/suggestion-editions';
import type { Choosing } from '@/components/suggestion-editions';
import { PageHeader } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { index as libraryIndex } from '@/routes/library';
import { accept, alreadyRead, dismiss, generate } from '@/routes/suggestions';
import type { Suggestion } from '@/types';

type SuggestionsProps = {
    suggestions: Suggestion[];
    hasSources: boolean;
};

export default function Suggestions({
    suggestions,
    hasSources,
}: SuggestionsProps) {
    const { t } = useTranslation();
    const [busy, setBusy] = useState(false);

    // Actions swap the list on the page itself; Inertia reloads the suggestions.
    const options = {
        preserveScroll: true,
        onStart: () => setBusy(true),
        onFinish: () => setBusy(false),
    };

    return (
        <>
            <PageHeader
                title={t('Sugestões')}
                description={t('Livros novos, sempre com o motivo')}
                actions={
                    <Button
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
                        className="text-accent hover:underline"
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

            <div className="flex flex-col gap-4">
                {suggestions.map((suggestion) => (
                    <SuggestionCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        disabled={busy}
                        options={options}
                    />
                ))}
            </div>

            {hasSources && suggestions.length > 0 && (
                <div className="flex flex-col items-start gap-2 pb-4">
                    <Button
                        variant="outline"
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
        </>
    );
}

function EmptyState({ children }: { children: ReactNode }) {
    return (
        <p className="rounded-md border bg-surface p-5 text-sm text-muted">
            {children}
        </p>
    );
}

function SuggestionCard({
    suggestion,
    disabled,
    options,
}: {
    suggestion: Suggestion;
    disabled: boolean;
    options: { preserveScroll: boolean };
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [choosing, setChoosing] = useState<Choosing | null>(null);

    return (
        <article className="flex flex-wrap gap-5 rounded-md border bg-surface p-5">
            <BookCover
                src={suggestion.cover_url}
                title={suggestion.title}
                className="w-20"
            />

            <div className="flex min-w-60 flex-1 flex-col gap-2">
                <h2 className="text-lg leading-snug font-bold">
                    {suggestion.title}
                </h2>
                {suggestion.authors && (
                    <p className="text-sm text-muted">{suggestion.authors}</p>
                )}
                <p className="text-sm">
                    {t('Por quê: :reason', { reason: suggestion.reason })}
                </p>
                <span className="self-start rounded-full bg-elevated px-3 py-1 font-mono text-xs text-muted">
                    {t('Parecido com: :book', { book: suggestion.based_on })}
                </span>
                {suggestion.has_editions && (
                    <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setOpen(!open)}
                        className="self-start text-sm text-accent hover:underline"
                    >
                        {open
                            ? t('− Esconder edições')
                            : t('+ Escolher edição')}
                    </button>
                )}
            </div>

            <div className="flex flex-col justify-center gap-2">
                <Button
                    variant="outline"
                    disabled={disabled}
                    onClick={() =>
                        suggestion.has_editions
                            ? setChoosing('want')
                            : router.visit(accept(suggestion.id), options)
                    }
                >
                    {t('Quero ler')}
                </Button>
                <Button
                    variant="ghost"
                    disabled={disabled}
                    onClick={() =>
                        suggestion.has_editions
                            ? setChoosing('read')
                            : router.visit(alreadyRead(suggestion.id), options)
                    }
                >
                    {t('Já li')}
                </Button>
                <Button
                    variant="ghost"
                    disabled={disabled}
                    onClick={() =>
                        router.visit(dismiss(suggestion.id), options)
                    }
                >
                    {t('Sem interesse')}
                </Button>
            </div>

            {(open || choosing) && (
                <SuggestionEditions
                    key={choosing ?? 'browse'}
                    id={suggestion.id}
                    disabled={disabled}
                    options={options}
                    mode={choosing}
                    onCancel={() => {
                        setChoosing(null);
                        setOpen(false);
                    }}
                />
            )}
        </article>
    );
}
