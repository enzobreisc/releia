import { router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { cardClass } from '@/components/card';
import { DatePicker } from '@/components/date-picker';
import { Button, Field, Input } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { today } from '@/lib/dates';
import { destroy, update } from '@/routes/sessions';
import type { ReadingSession } from '@/types';

/** Sessions of a reading, most recent first. */
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
            <p
                className={cardClass(
                    'px-5 py-5.5 text-sm font-semibold text-muted',
                )}
            >
                {emptyText ??
                    t(
                        'Nenhuma sessão ainda. Registre a página em que você parou.',
                    )}
            </p>
        );
    }

    return (
        <ol className={cardClass('flex flex-col overflow-hidden')}>
            {sessions.map((session) => (
                <SessionRow
                    key={session.id}
                    session={session}
                    readOnly={readOnly}
                />
            ))}
        </ol>
    );
}

function SessionRow({
    session,
    readOnly,
}: {
    session: ReadingSession;
    readOnly: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const { t, shortDate } = useTranslation();

    if (editing) {
        return (
            <li className="border-b border-border px-5 py-4 last:border-b-0">
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
        <li className="grid grid-cols-[minmax(70px,1fr)_minmax(90px,1.2fr)_minmax(50px,0.7fr)_minmax(60px,0.8fr)_auto] items-center gap-3.5 border-b border-border px-5 py-3.5 font-mono text-[13px] last:border-b-0 max-sm:grid-cols-2">
            <span className="font-sans text-[15px] font-bold">
                {shortDate(session.read_on)}
            </span>
            <span className="text-muted">
                {t('p. :page', {
                    page: `${session.page_from} → ${session.page_to}`,
                })}
            </span>
            <span className="text-link">+{session.pages}</span>
            <span className="text-muted">
                {session.minutes === null
                    ? '—'
                    : t(':minutes min', { minutes: session.minutes })}
            </span>
            {!readOnly && (
                <span className="flex gap-4 font-sans text-[13px] font-semibold">
                    <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="text-secondary hover:text-text"
                    >
                        {t('editar')}
                    </button>
                    <button
                        type="button"
                        onClick={remove}
                        className="text-secondary hover:text-danger"
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
            <div className="flex min-w-0 flex-[1_1_140px] flex-col gap-1.5 text-xs font-bold text-muted">
                <span>{t('Data')}</span>
                <DatePicker
                    aria-label={t('Data da sessão')}
                    max={today()}
                    value={form.data.read_on}
                    onChange={(value) => form.setData('read_on', value)}
                />
                {form.errors.read_on && (
                    <span className="text-xs font-semibold text-danger">
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
