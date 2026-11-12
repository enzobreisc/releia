import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Select } from '@/components/form';
import { SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { store as pinBook } from '@/routes/profile/pins';
import { PinnedCard } from './pinned-card';
import type { PinOption, PinnedBook } from './types';

export function PinnedSection({
    pinned,
    options,
    limit,
}: {
    pinned: PinnedBook[];
    options: PinOption[];
    limit: number;
}) {
    const { t } = useTranslation();
    const errors = usePage<{ errors: Record<string, string> }>().props.errors;
    const [editing, setEditing] = useState(pinned.length === 0);
    const canPin = pinned.length < limit && options.length > 0;

    return (
        <section
            aria-label={t('Livros fixados')}
            className="flex flex-col gap-3.5"
        >
            <div className="flex items-baseline justify-between gap-3">
                <SectionTitle>
                    {t('Livros fixados · :count/:limit', {
                        count: pinned.length,
                        limit,
                    })}
                </SectionTitle>
                <button
                    type="button"
                    onClick={() => setEditing(!editing)}
                    className="text-[13px] font-bold text-link hover:underline"
                >
                    {editing ? t('Concluir') : t('Organizar fixados')}
                </button>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-3">
                {pinned.map((book) => (
                    <PinnedCard key={book.id} book={book} editing={editing} />
                ))}

                {editing && canPin && (
                    <label className="flex min-h-26.5 flex-col justify-center gap-2 rounded-md border border-dashed border-strong p-3.5 text-xs font-bold text-muted">
                        {t('Fixar outro livro')}
                        <Select
                            defaultValue=""
                            onChange={(event) =>
                                event.target.value &&
                                router.post(
                                    pinBook.url(),
                                    { book_id: event.target.value },
                                    { preserveScroll: true },
                                )
                            }
                            className="h-10"
                        >
                            <option value="" disabled>
                                {t('Escolha um livro…')}
                            </option>
                            {options.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.title}
                                </option>
                            ))}
                        </Select>
                    </label>
                )}
            </div>

            {pinned.length === 0 && !canPin && (
                <p className="text-sm text-muted">
                    {t(
                        'Adicione livros à biblioteca para fixar os seus favoritos aqui.',
                    )}
                </p>
            )}
            {errors?.book_id && (
                <p className="text-sm text-danger">{errors.book_id}</p>
            )}
        </section>
    );
}
