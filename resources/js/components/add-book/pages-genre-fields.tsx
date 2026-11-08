import { GenreSelect } from '@/components/genre-select';
import { Field, Input } from '@/components/form';
import type { BookFormHandle } from '@/components/add-book/book-form';
import { useTranslation } from '@/hooks/use-translation';

type PagesGenreFieldsProps = {
    form: BookFormHandle;
    genres: string[];
};

export function PagesGenreFields({ form, genres }: PagesGenreFieldsProps) {
    const { t } = useTranslation();

    return (
        <div className="flex gap-2.5">
            <Field
                label={t('Páginas')}
                error={form.errors.pages}
                className="flex-1"
            >
                <Input
                    type="number"
                    min={1}
                    value={form.data.pages}
                    onChange={(event) =>
                        form.setData('pages', event.target.value)
                    }
                    className="min-w-0 font-mono"
                />
            </Field>
            <div className="flex flex-[2_1_0] flex-col gap-1.5 text-xs font-bold text-muted">
                <span>{t('Gênero')}</span>
                <GenreSelect
                    value={form.data.genre}
                    onChange={(value) => form.setData('genre', value)}
                    genres={genres}
                />
                {form.errors.genre && (
                    <span className="text-xs font-semibold text-danger">
                        {form.errors.genre}
                    </span>
                )}
            </div>
        </div>
    );
}
