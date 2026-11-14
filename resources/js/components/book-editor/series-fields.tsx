import { Field, Input } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import type { EditorForm } from './types';

export function SeriesFields({ form }: { form: EditorForm }) {
    const { t } = useTranslation();

    return (
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2.5">
            <Field label={t('Série')} error={form.errors.series}>
                <Input
                    value={form.data.series}
                    onChange={(event) =>
                        form.setData('series', event.target.value)
                    }
                    className="h-10 bg-bg text-sm"
                />
            </Field>
            <Field label={t('Volume')} error={form.errors.series_position}>
                <Input
                    type="number"
                    min={1}
                    value={form.data.series_position}
                    onChange={(event) =>
                        form.setData('series_position', event.target.value)
                    }
                    className="h-10 bg-bg text-sm"
                />
            </Field>
        </div>
    );
}
