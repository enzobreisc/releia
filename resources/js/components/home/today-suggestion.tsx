import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { BookCover } from '@/components/book-cover';
import { cardClass } from '@/components/card';
import { Button } from '@/components/form';
import { SuggestionEditions } from '@/components/suggestion-editions';
import type { Choosing } from '@/components/suggestion-editions';
import { useTranslation } from '@/hooks/use-translation';
import {
    accept,
    dismiss,
    index as suggestionsIndex,
} from '@/routes/suggestions';
import type { Suggestion } from '@/types';

export function TodaySuggestion({ suggestion }: { suggestion: Suggestion }) {
    const { t } = useTranslation();
    const options = { preserveScroll: true };
    const [open, setOpen] = useState(false);
    const [choosing, setChoosing] = useState<Choosing | null>(null);

    return (
        <section
            aria-labelledby="suggestion-title"
            className={cardClass(
                'flex min-w-0 flex-wrap items-center gap-5 px-5.5 py-5',
            )}
        >
            <BookCover
                src={suggestion.cover_url}
                title={suggestion.title}
                className="w-16.5"
            />
            <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-1.5">
                <h2
                    id="suggestion-title"
                    className="text-xs font-bold text-muted"
                >
                    {t('Sugestão de hoje')}
                </h2>
                <p className="text-xl font-extrabold tracking-tight">
                    {suggestion.title}
                    {suggestion.authors && (
                        <span className="font-semibold text-secondary">
                            {' '}
                            · {suggestion.authors}
                        </span>
                    )}
                </p>
                <p className="text-[13px] font-medium text-muted">
                    {t('Por quê: :reason · parecido com :book', {
                        reason: suggestion.reason,
                        book: suggestion.based_on,
                    })}
                </p>
                <div className="flex flex-wrap gap-4">
                    <Link
                        href={suggestionsIndex.url()}
                        className="text-xs font-bold text-link hover:underline"
                    >
                        {t('Ver mais sugestões')}
                    </Link>
                    {suggestion.has_editions && (
                        <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setOpen(!open)}
                            className="text-xs font-bold text-link hover:underline"
                        >
                            {open
                                ? t('− Esconder edições')
                                : t('+ Escolher edição')}
                        </button>
                    )}
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <Button
                    className="h-10 px-4 text-[13px]"
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
                    className="h-10 px-4 text-[13px]"
                    onClick={() =>
                        router.visit(dismiss(suggestion.id), options)
                    }
                >
                    {t('Dispensar')}
                </Button>
            </div>
            {(open || choosing) && (
                <SuggestionEditions
                    key={choosing ?? 'browse'}
                    id={suggestion.id}
                    disabled={false}
                    options={options}
                    mode={choosing}
                    onCancel={() => {
                        setChoosing(null);
                        setOpen(false);
                    }}
                />
            )}
        </section>
    );
}
