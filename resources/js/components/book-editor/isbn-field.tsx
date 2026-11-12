import { Link } from '@inertiajs/react';
import { Button, Input } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { show } from '@/routes/books';
import { ErrorAlert } from './error-alert';
import { serverErrors } from './fields';
import type { EditorForm } from './types';

export function IsbnField({
    form,
    searching,
    onRefresh,
}: {
    form: EditorForm;
    searching: boolean;
    onRefresh: () => void;
}) {
    const { t } = useTranslation();
    const errors = serverErrors(form);

    return (
        <>
            <div className="flex flex-col gap-1.5 text-[13px] text-muted">
                <label htmlFor="book-editor-isbn">ISBN</label>
                <span className="flex gap-1.5">
                    <Input
                        id="book-editor-isbn"
                        value={form.data.isbn_13}
                        aria-invalid={errors.isbn_13 !== undefined}
                        onChange={(event) =>
                            form.setData('isbn_13', event.target.value)
                        }
                        className={cn(
                            'h-10 flex-1 bg-bg font-mono text-sm',
                            errors.isbn_13 && 'inset-ring-danger-line',
                        )}
                    />
                    <Button
                        variant="ghost"
                        onClick={onRefresh}
                        disabled={searching || form.data.isbn_13.trim() === ''}
                        title={t('Buscar os dados de novo por este ISBN')}
                        className="h-10 shrink-0 px-3 text-xs text-accent"
                    >
                        {searching ? t('buscando…') : t('↻ buscar')}
                    </Button>
                </span>
            </div>
            {errors.isbn_13 && (
                <ErrorAlert>
                    <span>{errors.isbn_13}</span>
                    {errors.isbn_13_book && (
                        <>
                            <span className="text-secondary">
                                {t(
                                    'Se são edições diferentes, cada uma pode ficar com seu ISBN.',
                                )}
                            </span>
                            <Link
                                href={show.url(Number(errors.isbn_13_book))}
                                className="font-semibold text-accent hover:underline"
                            >
                                {t('Abrir o outro livro ›')}
                            </Link>
                        </>
                    )}
                </ErrorAlert>
            )}
        </>
    );
}
