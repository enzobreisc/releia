import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Markdown } from '@/components/markdown';
import { Button, Field, Input, Select, Textarea } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { destroy, store, update } from '@/routes/notes';
import type { NoteCard } from '@/types/notes';
import type { Option } from '@/types';

type NoteEditorProps = {
    /** Existing note; null when it is a new note. */
    note: NoteCard | null;
    bookId: number;
    kinds: Option[];
    onClose: () => void;
};

/** Note dialog on the book page: Markdown text with preview, kind and page. */
export function NoteEditor({ note, bookId, kinds, onClose }: NoteEditorProps) {
    const { t } = useTranslation();
    const [kind, setKind] = useState(note?.kind ?? kinds[0]?.value ?? '');
    const [page, setPage] = useState(note?.page ? String(note.page) : '');
    const [body, setBody] = useState(note?.body_md ?? '');
    const [tab, setTab] = useState<'edit' | 'preview'>('edit');
    const [saving, setSaving] = useState(false);

    const data = {
        book_id: bookId,
        kind,
        page: page === '' ? null : Number(page),
        body_md: body,
    };

    function save() {
        const options = {
            preserveScroll: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
            onSuccess: onClose,
        };

        if (note) {
            router.patch(update.url(note.id), data, options);
        } else {
            router.post(store.url(), data, options);
        }
    }

    // Deletes right away: the notice offers undo (text, tags and page come back).
    function remove() {
        if (note) {
            router.delete(destroy.url(note.id), {
                preserveScroll: true,
                onSuccess: onClose,
            });
        }
    }

    return (
        <Dialog
            title={note ? t('Editar nota') : t('Nova nota')}
            onClose={onClose}
            className="max-w-160"
        >
            <div className="flex flex-wrap items-end gap-3">
                <Field label={t('Tipo')} className="flex-[2_1_180px]">
                    <Select
                        value={kind}
                        onChange={(event) => setKind(event.target.value)}
                    >
                        {kinds.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label={t('Página')} className="flex-[1_1_100px]">
                    <Input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={page}
                        onChange={(event) => setPage(event.target.value)}
                    />
                </Field>
                <div
                    role="tablist"
                    aria-label={t('Modo do editor')}
                    className="flex gap-1 rounded-full bg-bg p-1 inset-ring inset-ring-border"
                >
                    {(['edit', 'preview'] as const).map((mode) => (
                        <button
                            key={mode}
                            type="button"
                            role="tab"
                            aria-selected={tab === mode}
                            onClick={() => setTab(mode)}
                            className={cn(
                                'h-9 rounded-full px-3.5 text-xs font-bold',
                                tab === mode
                                    ? 'bg-text text-bg'
                                    : 'text-secondary hover:text-text',
                            )}
                        >
                            {mode === 'edit' ? t('Editar') : t('Prévia')}
                        </button>
                    ))}
                </div>
            </div>

            {tab === 'edit' ? (
                <Field label={t('Texto (Markdown). Tags: #tema')}>
                    <Textarea
                        autoFocus
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        className="min-h-56 font-mono text-[14px]"
                        placeholder={t(
                            'Escreva o trecho, a reflexão ou a citação…',
                        )}
                    />
                </Field>
            ) : (
                <div className="min-h-56 rounded-md bg-bg p-4 inset-ring inset-ring-border">
                    {body.trim() === '' ? (
                        <p className="text-sm text-muted">
                            {t('Nada para mostrar ainda.')}
                        </p>
                    ) : (
                        <Markdown source={body} />
                    )}
                </div>
            )}

            {note && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {note.tags.map((tag) => (
                        <span
                            key={tag}
                            className="rounded-full bg-active px-3 py-1 text-xs font-bold text-link"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                <Button onClick={save} disabled={saving || body.trim() === ''}>
                    {saving
                        ? t('Salvando…')
                        : note
                          ? t('Salvar')
                          : t('Criar nota')}
                </Button>
                <Button variant="ghost" onClick={onClose}>
                    {t('Cancelar')}
                </Button>
                {note && (
                    <Button
                        variant="danger"
                        onClick={remove}
                        className="ml-auto"
                    >
                        {t('Excluir')}
                    </Button>
                )}
            </div>
        </Dialog>
    );
}
