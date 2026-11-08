import { Segmented } from '@/components/form';
import {
    type BookFormHandle,
    READ_STATUS,
    withStatus,
} from '@/components/add-book/book-form';
import { FinishedOnField } from '@/components/add-book/finished-on-field';
import { useTranslation } from '@/hooks/use-translation';
import type { Option } from '@/types';

type ReadingStatusFieldProps = {
    form: BookFormHandle;
    statuses: Option[];
};

export function ReadingStatusField({
    form,
    statuses,
}: ReadingStatusFieldProps) {
    const { t } = useTranslation();

    return (
        <fieldset className="flex flex-col gap-1.5">
            <legend className="pb-1.5 text-xs font-bold text-muted">
                {t('Estante')}
            </legend>
            <Segmented
                options={statuses}
                value={form.data.status}
                onChange={(value) =>
                    form.setData((data) => withStatus(data, value))
                }
            />
            {form.errors.status && (
                <span className="text-xs text-danger">
                    {form.errors.status}
                </span>
            )}
            {form.data.status === READ_STATUS && (
                <FinishedOnField form={form} />
            )}
        </fieldset>
    );
}
