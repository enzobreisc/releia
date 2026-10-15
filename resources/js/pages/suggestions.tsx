import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { BookCover } from '@/components/book-cover';
import { Button } from '@/components/form';
import { PageHeader } from '@/components/page-header';
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
    const [busy, setBusy] = useState(false);

    // As ações trocam a lista na própria página; o Inertia recarrega as sugestões.
    const options = {
        preserveScroll: true,
        onStart: () => setBusy(true),
        onFinish: () => setBusy(false),
    };

    return (
        <>
            <PageHeader
                title="Sugestões"
                description="Livros novos, sempre com o motivo"
                actions={
                    <Button
                        disabled={busy || !hasSources}
                        onClick={() => router.visit(generate(), options)}
                    >
                        Buscar novas sugestões
                    </Button>
                }
            />

            {!hasSources && (
                <EmptyState>
                    Avalie livros com 4 ou 5 estrelas para receber sugestões.{' '}
                    <Link
                        href={libraryIndex.url()}
                        className="text-accent hover:underline"
                    >
                        Ir para a biblioteca
                    </Link>
                </EmptyState>
            )}

            {hasSources && suggestions.length === 0 && (
                <EmptyState>
                    Nenhuma sugestão no momento. Use "Buscar novas sugestões"
                    para procurar mais.
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
                <p className="text-sm">Por quê: {suggestion.reason}</p>
                <span className="self-start rounded-full bg-elevated px-3 py-1 font-mono text-xs text-muted">
                    Parecido com: {suggestion.based_on}
                </span>
            </div>

            <div className="flex flex-col justify-center gap-2">
                <Button
                    variant="outline"
                    disabled={disabled}
                    onClick={() => router.visit(accept(suggestion.id), options)}
                >
                    Quero ler
                </Button>
                <Button
                    variant="ghost"
                    disabled={disabled}
                    onClick={() =>
                        router.visit(alreadyRead(suggestion.id), options)
                    }
                >
                    Já li
                </Button>
                <Button
                    variant="ghost"
                    disabled={disabled}
                    onClick={() =>
                        router.visit(dismiss(suggestion.id), options)
                    }
                >
                    Sem interesse
                </Button>
            </div>
        </article>
    );
}
