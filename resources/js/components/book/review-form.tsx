import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';
import { Button, Textarea } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { reading as readingRoute } from '@/routes/books';

export function ReviewForm({
    bookId,
    review,
    label,
    active,
}: {
    bookId: number;
    review: string;
    label: string;
    active: boolean;
}) {
    const { t } = useTranslation();
    const form = useForm({ review });

    function save(event?: FormEvent) {
        event?.preventDefault();

        if (!form.isDirty || form.processing) {
            return;
        }

        form.submit(readingRoute(bookId), {
            preserveScroll: true,
            onSuccess: () => form.setDefaults(),
        });
    }

    useEffect(() => {
        if (!active) {
            return;
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.metaKey && event.key.toLowerCase() === 's') {
                event.preventDefault();
                save();
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    });

    return (
        <form onSubmit={save} className="flex flex-col gap-3">
            <label
                htmlFor="review"
                className="text-[13px] font-bold text-muted"
            >
                {t('Resenha da :ordinal leitura · cada leitura tem a sua', {
                    ordinal: label,
                })}
            </label>
            <Textarea
                id="review"
                value={form.data.review}
                onChange={(event) => form.setData('review', event.target.value)}
                placeholder={t(
                    'O que você achou do livro? Ideias, trechos, impressões.',
                )}
                className="min-h-44 p-5 text-base leading-[1.6]"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                    className={cn(
                        'font-mono text-xs',
                        form.isDirty ? 'text-warn' : 'text-muted',
                    )}
                >
                    {form.recentlySuccessful
                        ? t('salvo')
                        : form.isDirty
                          ? t('alterações não salvas · ⌘S salva')
                          : t('markdown · ⌘S salva')}
                </span>
                <Button
                    type="submit"
                    disabled={!form.isDirty || form.processing}
                >
                    {form.processing ? t('Salvando…') : t('Salvar resenha')}
                </Button>
            </div>
        </form>
    );
}
