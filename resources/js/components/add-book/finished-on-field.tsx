import { DatePicker } from '@/components/date-picker';
import type { BookFormHandle } from '@/components/add-book/book-form';
import { useTranslation } from '@/hooks/use-translation';
import { today } from '@/lib/dates';

export function FinishedOnField({ form }: { form: BookFormHandle }) {
    const { t } = useTranslation();

    return (
        <div className="mt-1.5 flex flex-col gap-1.5">
            <span className="text-xs font-bold text-muted">
                {t('Terminou em')}
            </span>
            <div className="max-w-52">
                <DatePicker
                    aria-label={t('Data de término')}
                    max={today()}
                    disabled={form.data.undated}
                    value={form.data.undated ? '' : form.data.finished_on}
                    onChange={(value) => form.setData('finished_on', value)}
                    className="h-11"
                />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted">
                <input
                    type="checkbox"
                    checked={form.data.undated}
                    onChange={(event) =>
                        form.setData('undated', event.target.checked)
                    }
                    className="accent-accent"
                />
                {t('Não lembro / sem data de término')}
            </label>
            {form.errors.finished_on && (
                <span className="text-xs text-danger">
                    {form.errors.finished_on}
                </span>
            )}
        </div>
    );
}
