import { Field, Input } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import type { EditorForm } from './types';

export function PublisherYearFields({ form }: { form: EditorForm }) {
    const { t } = useTranslation();

    return (
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2.5">
            <Field label={t('Editora')} error={form.errors.publisher}>
                <Input
                    value={form.data.publisher}
                    onChange={(event) =>
                        form.setData('publisher', event.target.value)
                    }
                    className="h-10 bg-bg text-sm"
                />
            </Field>
            <Field label={t('Ano')} error={form.errors.published_year}>
                <Input
                    type="number"
                    value={form.data.published_year}
                    onChange={(event) =>
                        form.setData('published_year', event.target.value)
                    }
                    className="h-10 bg-bg text-sm"
                />
            </Field>
        </div>
    );
}
