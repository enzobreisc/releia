import { router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { DatePicker } from '@/components/date-picker';
import { Button, Field, Input } from '@/components/form';
import { today } from '@/lib/dates';
import { destroy, update } from '@/routes/sessions';
import type { ReadingSession } from '@/types';

/** Log de sessões no estilo de um histórico de commits: mais recente primeiro. */
export function SessionLog({
    sessions,
    emptyText = 'Nenhuma sessão ainda. Registre a página em que você parou.',
    readOnly = false,
}: {
    sessions: ReadingSession[];
    emptyText?: string;
    /** Leituras antigas (aba Leituras): só para ver. */
    readOnly?: boolean;
}) {
    if (sessions.length === 0) {
        return <p className="py-4 text-sm text-muted">{emptyText}</p>;
    }

    // A barrinha de cada sessão é proporcional à maior sessão do livro.
    const most = Math.max(...sessions.map((session) => session.pages), 1);

    return (
        <ol className="flex flex-col font-mono text-[13px]">
            {sessions.map((session) => (
                <SessionRow
                    key={session.id}
                    session={session}
                    share={session.pages / most}
                    readOnly={readOnly}
                />
            ))}
        </ol>
    );
}

function SessionRow({
    session,
    share,
    readOnly,
}: {
    session: ReadingSession;
    share: number;
    readOnly: boolean;
}) {
    const [editing, setEditing] = useState(false);

    if (editing) {
        return (
            <li className="border-b py-3 font-sans">
                <EditSession
                    session={session}
                    onDone={() => setEditing(false)}
                />
            </li>
        );
    }

    // Apaga na hora: o aviso oferece desfazer (sessão e página voltam).
    function remove() {
        router.delete(destroy(session.id).url, { preserveScroll: true });
    }

    return (
        <li className="group flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b py-2.5">
            <span className="text-accent">{session.hash}</span>
            <span className="w-24 text-muted">
                {formatDate(session.read_on)}
            </span>
            <span className="w-24">
                p. {session.page_from} → {session.page_to}
            </span>
            <span className="flex min-w-24 flex-1 items-center gap-2">
                <span
                    className="h-1.5 rounded-full bg-primary"
                    style={{ width: `${Math.max(6, share * 120)}px` }}
                />
                <span className="text-heat-3">+{session.pages}</span>
            </span>
            <span className="w-14 text-right text-muted">
                {session.minutes === null ? '—' : `${session.minutes} min`}
            </span>
            {!readOnly && (
                <span className="flex gap-3 text-xs opacity-60 group-hover:opacity-100 focus-within:opacity-100">
                    <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="text-muted hover:text-text"
                    >
                        editar
                    </button>
                    <button
                        type="button"
                        onClick={remove}
                        className="text-muted hover:text-red-300"
                    >
                        apagar
                    </button>
                </span>
            )}
        </li>
    );
}

function EditSession({
    session,
    onDone,
}: {
    session: ReadingSession;
    onDone: () => void;
}) {
    const form = useForm({
        read_on: session.read_on,
        page_to: String(session.page_to),
        minutes: session.minutes === null ? '' : String(session.minutes),
    });

    function save(event: FormEvent) {
        event.preventDefault();
        form.submit(update(session.id), {
            preserveScroll: true,
            onSuccess: onDone,
        });
    }

    return (
        <form onSubmit={save} className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-0 flex-[1_1_140px] flex-col gap-1.5 text-[13px] text-muted">
                <span>Data</span>
                <DatePicker
                    aria-label="Data da sessão"
                    max={today()}
                    value={form.data.read_on}
                    onChange={(value) => form.setData('read_on', value)}
                />
                {form.errors.read_on && (
                    <span className="text-xs text-red-300">
                        {form.errors.read_on}
                    </span>
                )}
            </div>
            <Field
                label={`Página final (começa na ${session.page_from})`}
                error={form.errors.page_to}
                className="flex-[1_1_120px]"
            >
                <Input
                    type="number"
                    min={session.page_from}
                    value={form.data.page_to}
                    onChange={(event) =>
                        form.setData('page_to', event.target.value)
                    }
                />
            </Field>
            <Field
                label="Minutos"
                error={form.errors.minutes}
                className="flex-[1_1_100px]"
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
            <Button type="submit" variant="ghost" disabled={form.processing}>
                Salvar
            </Button>
            <Button variant="ghost" onClick={onDone}>
                Cancelar
            </Button>
        </form>
    );
}

/** "14 out 2026". */
function formatDate(date: string): string {
    return new Date(`${date}T12:00:00`)
        .toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        .replaceAll(' de ', ' ')
        .replace('.', '');
}
