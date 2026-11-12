import { Field, Input } from '@/components/form';
import { GenreSelect } from '@/components/genre-select';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { ErrorAlert } from './error-alert';
import { serverErrors } from './fields';
import type { EditorForm } from './types';

export function PagesGenreFields({
    form,
    genres,
    onShowSessions,
}: {
    form: EditorForm;
    genres: string[];
    onShowSessions: () => void;
}) {
    const { t } = useTranslation();
    const errors = serverErrors(form);

    return (
        <>
            <div className="grid grid-cols-2 gap-2.5">
                <Field label={t('Páginas')}>
                    <Input
                        type="number"
                        min={1}
                        value={form.data.pages}
                        aria-invalid={errors.pages !== undefined}
                        onChange={(event) =>
                            form.setData('pages', event.target.value)
                        }
                        className={cn(
                            'h-10 bg-bg font-mono text-sm',
                            errors.pages && 'inset-ring-danger-line',
                        )}
                    />
                </Field>
                <div className="flex flex-col gap-1.5 text-[13px] text-muted">
                    <span>{t('Gênero')}</span>
                    <GenreSelect
                        value={form.data.genre}
                        onChange={(value) => form.setData('genre', value)}
                        genres={genres}
                        className="text-sm"
                    />
                    {form.errors.genre && (
                        <span className="text-xs font-semibold text-danger">
                            {form.errors.genre}
                        </span>
                    )}
                </div>
            </div>
            {errors.pages && (
                <ErrorAlert>
                    <span>{errors.pages}</span>
                    {errors.pages_session && (
                        <button
                            type="button"
                            onClick={onShowSessions}
                            className="font-semibold text-accent hover:underline"
                        >
                            {t('Editar essa sessão primeiro ›')}
                        </button>
                    )}
                </ErrorAlert>
            )}
        </>
    );
}
