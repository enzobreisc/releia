import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Button, Field, Input, Select } from '@/components/form';
import { ProgressBar, progressText } from '@/components/reading-progress';
import { store as quickLogStore } from '@/routes/quick-log';
import type { ReadingSummary } from '@/types';

type QuickLogProps = {
    readings: ReadingSummary[];
    streak: number;
};

/**
 * Janela da barra de menu (360×340). Não usa o layout com barra lateral:
 * o app.tsx pula o layout para esta página.
 */
export default function QuickLog({ readings, streak }: QuickLogProps) {
    const [bookId, setBookId] = useState<number | null>(
        readings[0]?.book_id ?? null,
    );
    const selected =
        readings.find((item) => item.book_id === bookId) ?? readings[0] ?? null;

    return (
        <div className="flex min-h-screen flex-col gap-3.5 bg-bg p-5 text-text">
            <Head title="Registro rápido" />
            <div className="flex items-center justify-between">
                <span className="font-mono text-lg font-bold">
                    Registro rápido
                </span>
                <span className="font-mono text-xs text-muted">releia</span>
            </div>

            {selected === null ? (
                <p className="text-sm text-muted">
                    Nenhuma leitura em andamento. Marque um livro como "Lendo"
                    na biblioteca para ele aparecer aqui.
                </p>
            ) : (
                <QuickLogForm
                    // Remonta ao trocar de livro ou depois de salvar, para usar a página nova.
                    key={`${selected.book_id}-${selected.current_page}`}
                    readings={readings}
                    selected={selected}
                    streak={streak}
                    onSelect={setBookId}
                />
            )}
        </div>
    );
}

function QuickLogForm({
    readings,
    selected,
    streak,
    onSelect,
}: {
    readings: ReadingSummary[];
    selected: ReadingSummary;
    streak: number;
    onSelect: (bookId: number) => void;
}) {
    const form = useForm({
        book_id: selected.book_id,
        page_to: String(selected.current_page),
        minutes: '',
    });

    function save(event: FormEvent) {
        event.preventDefault();
        form.submit(quickLogStore(), {
            preserveScroll: true,
            onSuccess: () => form.setData('minutes', ''),
        });
    }

    return (
        <form onSubmit={save} className="flex flex-1 flex-col gap-3.5">
            <Field label="Livro">
                <Select
                    value={selected.book_id}
                    onChange={(event) => onSelect(Number(event.target.value))}
                >
                    {readings.map((item) => (
                        <option key={item.book_id} value={item.book_id}>
                            {item.title}
                        </option>
                    ))}
                </Select>
            </Field>

            <div className="flex gap-3">
                <Field
                    label="Página atual"
                    error={form.errors.page_to}
                    className="flex-1"
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
                    label="Minutos"
                    error={form.errors.minutes}
                    className="flex-1"
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
            </div>
            {form.errors.book_id && (
                <p className="text-xs text-red-300">{form.errors.book_id}</p>
            )}

            <div className="flex flex-col gap-1.5">
                <ProgressBar percent={selected.percent} />
                <span className="text-xs text-muted">
                    {progressText(selected)} · sequência de {streak}{' '}
                    {streak === 1 ? 'dia' : 'dias'}
                </span>
            </div>

            <Button
                type="submit"
                disabled={form.processing}
                className="mt-auto h-12"
            >
                {form.processing ? 'Salvando…' : 'Salvar'}
            </Button>
        </form>
    );
}
