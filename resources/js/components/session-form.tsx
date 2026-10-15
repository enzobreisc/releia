import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button, Field, Input } from '@/components/form';
import { store } from '@/routes/sessions';
import type { ReadingProgress } from '@/types';

/**
 * Registro de hoje: página em que você parou e minutos opcionais.
 * A chave pelo progresso faz o formulário recomeçar do valor novo depois de salvar.
 */
export function SessionForm({
    bookId,
    progress,
}: {
    bookId: number;
    progress: ReadingProgress;
}) {
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

    return (
        <form
            key={progress.current_page}
            onSubmit={save}
            className="flex flex-wrap items-end gap-3"
        >
            <Field
                label="Página atual"
                error={form.errors.page_to}
                className="flex-[1_1_120px]"
            >
                <Input
                    type="number"
                    min={1}
                    value={form.data.page_to}
                    onChange={(event) =>
                        form.setData('page_to', event.target.value)
                    }
                />
            </Field>
            <Field
                label="Minutos (opcional)"
                error={form.errors.minutes}
                className="flex-[1_1_120px]"
            >
                <Input
                    type="number"
                    min={1}
                    value={form.data.minutes}
                    onChange={(event) =>
                        form.setData('minutes', event.target.value)
                    }
                />
            </Field>
            <Button type="submit" disabled={form.processing}>
                {form.processing ? 'Salvando…' : 'Salvar sessão'}
            </Button>
        </form>
    );
}
