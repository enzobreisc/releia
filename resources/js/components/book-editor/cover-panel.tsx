import { useRef } from 'react';
import type { DragEvent } from 'react';
import { AmazonCoverField } from '@/components/amazon-cover-field';
import { Field, Input } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import type { EditorForm } from './types';

export function CoverPanel({ form }: { form: EditorForm }) {
    const { t } = useTranslation();
    const fileInput = useRef<HTMLInputElement>(null);

    function onDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        const file = event.dataTransfer.files[0];

        if (file) {
            form.setData('cover_file', file);
        }
    }

    return (
        <div className="flex flex-col gap-2 rounded-md bg-bg p-3.5 inset-ring inset-ring-border">
            <span className="text-xs font-bold text-muted first-letter:uppercase">
                {t('nova capa')}
            </span>
            <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={onDrop}
                className="flex h-16 items-center justify-center gap-1 rounded-sm border border-dashed border-strong text-xs text-secondary"
            >
                {form.data.cover_file
                    ? form.data.cover_file.name
                    : t('Arraste uma imagem aqui ou')}
                <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="text-accent hover:underline"
                >
                    {form.data.cover_file
                        ? t('trocar')
                        : t('escolha um arquivo')}
                </button>
                <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={(event) =>
                        form.setData(
                            'cover_file',
                            event.target.files?.[0] ?? null,
                        )
                    }
                />
            </div>
            <Field
                label={t('Ou cole o link de uma imagem')}
                error={form.errors.cover_url ?? form.errors.cover_file}
            >
                <Input
                    type="url"
                    value={form.data.cover_url}
                    placeholder="https://…"
                    onChange={(event) =>
                        form.setData('cover_url', event.target.value)
                    }
                    className="h-9 text-[13px]"
                />
            </Field>
            <AmazonCoverField
                onFound={(coverUrl) => {
                    // A file chosen earlier is superseded: the new link is the one that counts now.
                    form.setData((data) => ({
                        ...data,
                        cover_file: null,
                        cover_url: coverUrl,
                    }));
                }}
            />
            <span className="text-[11px] text-faint">
                {t(
                    'A imagem é guardada no Mac; não depende do link. Trocar a capa não tem desfazer.',
                )}
            </span>
        </div>
    );
}
