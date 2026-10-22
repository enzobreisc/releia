import { router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { DatePicker } from '@/components/date-picker';
import { Button, Field, Input } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { today } from '@/lib/dates';
import { destroy, update } from '@/routes/sessions';
import type { ReadingSession } from '@/types';

/** Session log styled like a commit history: most recent first. */
export function SessionLog({
    sessions,
    emptyText,
    readOnly = false,
}: {
    sessions: ReadingSession[];
    emptyText?: string;
    /** Old readings (Readings tab): view only. */
    readOnly?: boolean;
}) {
    const { t } = useTranslation();

    if (sessions.length === 0) {
        return (
            <p className="py-4 text-sm text-muted">
                {emptyText ??
                    t(
                        'Nenhuma sessão ainda. Registre a página em que você parou.',
                    )}
            </p>
        );
    }

    // Each session's little bar is proportional to the book's largest session.
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
    const { t, fullDate } = useTranslation();

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

    // Deletes right away: the notice offers undo (session and page come back).
    function remove() {
        router.delete(destroy(session.id).url, { preserveScroll: true });
    }

    return (
        <li className="group flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b py-2.5">
            <span className="text-accent">{session.hash}</span>
            <span className="w-24 text-muted">{fullDate(session.read_on)}</span>
            <span className="w-24">
                {t('p. :page', {
                    page: `${session.page_from} → ${session.page_to}`,
                })}
            </span>
            <span className="flex min-w-24 flex-1 items-center gap-2">
                <span
                    className="h-1.5 rounded-full bg-primary"
                    style={{ width: `${Math.max(6, share * 120)}px` }}
                />
                <span className="text-heat-3">+{session.pages}</span>
            </span>
            <span className="w-14 text-right text-muted">
                {session.minutes === null
                    ? '—'
                    : t(':minutes min', { minutes: session.minutes })}
            </span>
            {!readOnly && (
                <span className="flex gap-3 text-xs opacity-60 group-hover:opacity-100 focus-within:opacity-100">
                    <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="text-muted hover:text-text"
                    >
                        {t('editar')}
                    </button>
                    <button
                        type="button"
                        onClick={remove}
                        className="text-muted hover:text-red-300"
                    >
                        {t('apagar')}
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
    const { t } = useTranslation();
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
                <span>{t('Data')}</span>
                <DatePicker
                    aria-label={t('Data da sessão')}
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
                label={t('Página final (começa na :page)', {
                    page: session.page_from,
                })}
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
                label={t('Minutos')}
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
                {t('Salvar')}
            </Button>
            <Button variant="ghost" onClick={onDone}>
                {t('Cancelar')}
            </Button>
        </form>
    );
}
