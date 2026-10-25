import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button, Field, Input } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { store } from '@/routes/sessions';
import type { ReadingProgress } from '@/types';

const BUMPS = [10, 20, 50];

/**
 * Today's log: the page where you stopped, +pages shortcuts and optional minutes.
 * Keying by progress makes the form restart from the new value after saving.
 */
export function SessionForm({
    bookId,
    progress,
    onFinish,
}: {
    bookId: number;
    progress: ReadingProgress;
    onFinish?: () => void;
}) {
    const { t } = useTranslation();
    const form = useForm({
        page_to: String(progress.current_page),
        minutes: '',
    });

    function save(event: FormEvent) {
        event.preventDefault();
        form.submit(store(bookId), {
            preserveScroll: true,
            onSuccess: () => form.reset('minutes'),
        });
    }

    function bump(pages: number) {
        const next =
            (Number(form.data.page_to) || progress.current_page) + pages;
        form.setData(
            'page_to',
            String(progress.pages ? Math.min(progress.pages, next) : next),
        );
    }

    return (
        <form
            key={progress.current_page}
            onSubmit={save}
            className="flex flex-wrap items-end gap-3"
        >
            <Field label={t('Parei na página')}>
                <Input
                    type="number"
                    min={1}
                    max={progress.pages ?? undefined}
                    value={form.data.page_to}
                    onChange={(event) =>
                        form.setData('page_to', event.target.value)
                    }
                    className="h-12 w-37.5 bg-bg text-lg font-bold"
                />
            </Field>
            <div className="flex gap-1.5">
                {BUMPS.map((pages) => (
                    <Button
                        key={pages}
                        variant="ghost"
                        onClick={() => bump(pages)}
                        className="h-12 px-3.5 font-mono text-xs font-medium text-link"
                    >
                        +{pages}
                    </Button>
                ))}
            </div>
            <Field label={t('Minutos')}>
                <Input
                    type="number"
                    min={1}
                    placeholder={t('opcional')}
                    value={form.data.minutes}
                    onChange={(event) =>
                        form.setData('minutes', event.target.value)
                    }
                    className="h-12 w-37.5 bg-bg text-lg font-bold"
                />
            </Field>
            <Button
                type="submit"
                variant="outline"
                disabled={form.processing}
                className="h-12 px-5.5 font-extrabold"
            >
                {form.processing ? t('Salvando…') : t('Registrar')}
                <span className="font-mono text-[11px] font-normal text-muted">
                    ↵
                </span>
            </Button>
            {onFinish && (
                <Button variant="ghost" onClick={onFinish} className="h-12">
                    {t('Terminei')}
                </Button>
            )}
            {(form.errors.page_to || form.errors.minutes) && (
                <p
                    role="alert"
                    className="basis-full text-[13px] font-semibold text-warn"
                >
                    {form.errors.page_to ?? form.errors.minutes}
                </p>
            )}
        </form>
    );
}
