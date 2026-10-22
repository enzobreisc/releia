import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button, Input } from '@/components/form';
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
        const next = progress.current_page + pages;
        form.setData(
            'page_to',
            String(progress.pages ? Math.min(progress.pages, next) : next),
        );
    }

    return (
        <form
            key={progress.current_page}
            onSubmit={save}
            className="flex flex-wrap items-end gap-2.5"
        >
            <label className="flex min-w-0 flex-[1_1_150px] flex-col gap-1 text-xs text-muted">
                {t('Parei na página')}
                <Input
                    type="number"
                    min={1}
                    max={progress.pages ?? undefined}
                    value={form.data.page_to}
                    onChange={(event) =>
                        form.setData('page_to', event.target.value)
                    }
                    className="h-10.5 border-primary font-mono text-base"
                />
            </label>
            <div className="flex gap-1">
                {BUMPS.map((pages) => (
                    <button
                        key={pages}
                        type="button"
                        onClick={() => bump(pages)}
                        className="h-10.5 rounded-sm border bg-surface px-2.5 font-mono text-xs text-accent hover:bg-active"
                    >
                        +{pages}
                    </button>
                ))}
            </div>
            <label className="flex min-w-0 flex-[0_1_110px] flex-col gap-1 text-xs text-muted">
                {t('Minutos')}
                <Input
                    type="number"
                    min={1}
                    placeholder={t('opcional')}
                    value={form.data.minutes}
                    onChange={(event) =>
                        form.setData('minutes', event.target.value)
                    }
                    className="h-10.5 text-sm"
                />
            </label>
            <Button type="submit" disabled={form.processing} className="h-10.5">
                {form.processing ? t('Salvando…') : t('Registrar')}
                <span className="font-mono text-[11px] font-medium opacity-85">
                    ↵
                </span>
            </Button>
            {onFinish && (
                <Button variant="ghost" onClick={onFinish} className="h-10.5">
                    {t('Terminei')}
                </Button>
            )}
            {(form.errors.page_to || form.errors.minutes) && (
                <p className="basis-full text-xs text-red-300">
                    {form.errors.page_to ?? form.errors.minutes}
                </p>
            )}
        </form>
    );
}
