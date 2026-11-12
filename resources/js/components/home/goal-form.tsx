import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button, Field, Input } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { update as updateGoal } from '@/routes/goal';

export function GoalForm({
    current,
    currentDaily,
    onSaved,
}: {
    current: number | null;
    currentDaily: number | null;
    onSaved: () => void;
}) {
    const { t } = useTranslation();
    const form = useForm({
        yearly_goal: String(current ?? 12),
        daily_goal: currentDaily === null ? '' : String(currentDaily),
    });

    function save(event: FormEvent) {
        event.preventDefault();
        form.submit(updateGoal(), {
            preserveScroll: true,
            onSuccess: onSaved,
        });
    }

    return (
        <form onSubmit={save} className="flex items-end gap-3">
            <Field label={t('Meta de livros')} error={form.errors.yearly_goal}>
                <Input
                    type="number"
                    min={1}
                    max={999}
                    value={form.data.yearly_goal}
                    onChange={(event) =>
                        form.setData('yearly_goal', event.target.value)
                    }
                />
            </Field>
            <Field
                label={t('Meta diária (páginas)')}
                error={form.errors.daily_goal}
            >
                <Input
                    type="number"
                    min={1}
                    max={2000}
                    value={form.data.daily_goal}
                    onChange={(event) =>
                        form.setData('daily_goal', event.target.value)
                    }
                />
            </Field>
            <Button
                type="submit"
                variant="ghost"
                disabled={form.processing || !form.isDirty}
            >
                {t('Salvar meta')}
            </Button>
        </form>
    );
}
