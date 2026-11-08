import { Field, Input } from '@/components/form';
import type { BookFormHandle } from '@/components/add-book/book-form';
import { useTranslation } from '@/hooks/use-translation';

export function TitleAuthorFields({ form }: { form: BookFormHandle }) {
    const { t } = useTranslation();

    return (
        <>
            <Field label={t('Título')} error={form.errors.title}>
                <Input
                    required
                    value={form.data.title}
                    onChange={(event) =>
                        form.setData('title', event.target.value)
                    }
                />
            </Field>
            <Field
                label={t('Autor (separe por vírgula)')}
                error={form.errors.authors}
            >
                <Input
                    value={form.data.authors}
                    onChange={(event) =>
                        form.setData('authors', event.target.value)
                    }
                />
            </Field>
        </>
    );
}
