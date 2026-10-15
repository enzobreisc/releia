import { router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Button, Field, Input } from '@/components/form';
import { destroy, update } from '@/routes/sessions';
import type { ReadingSession } from '@/types';

/** Log de sessões no estilo de um histórico de commits: mais recente primeiro. */
export function SessionLog({ sessions }: { sessions: ReadingSession[] }) {
    if (sessions.length === 0) {
        return (
            <p className="text-sm text-muted">
                Nenhuma sessão ainda. Registre a página em que você parou.
            </p>
        );
    }

    return (
        <ul className="flex flex-col">
            {sessions.map((session) => (
                <SessionRow key={session.id} session={session} />
            ))}
        </ul>
    );
}

function SessionRow({ session }: { session: ReadingSession }) {
    const [editing, setEditing] = useState(false);

    if (editing) {
        return (
            <li className="border-b py-3">
                <EditSession
                    session={session}
                    onDone={() => setEditing(false)}
                />
            </li>
        );
    }

    function remove() {
        if (
            confirm('Apagar esta sessão? O progresso do livro é recalculado.')
        ) {
            router.delete(destroy(session.id).url, { preserveScroll: true });
        }
    }

    return (
        <li className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b py-3 text-sm">
            <span className="w-18 font-mono text-accent">{session.hash}</span>
            <span className="flex-1">{formatDate(session.read_on)}</span>
            <span className="text-muted">
                págs. {session.page_from} a {session.page_to}
            </span>
            <span className="w-16 text-muted">
                {session.minutes === null ? '— min' : `${session.minutes} min`}
            </span>
            <span className="flex gap-3 font-mono text-xs">
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
            <Field
                label="Data"
                error={form.errors.read_on}
                className="flex-[1_1_140px]"
            >
                <Input
                    type="date"
                    value={form.data.read_on}
                    onChange={(event) =>
                        form.setData('read_on', event.target.value)
                    }
                />
            </Field>
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

function formatDate(date: string): string {
    return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}
