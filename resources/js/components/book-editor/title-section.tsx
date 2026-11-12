import { BookCover } from '@/components/book-cover';
import { Button, Field, Input } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import type { EditorForm } from './types';

export function TitleSection({
    form,
    preview,
    coverOpen,
    onToggleCover,
}: {
    form: EditorForm;
    preview: string | null;
    coverOpen: boolean;
    onToggleCover: () => void;
}) {
    const { t } = useTranslation();

    return (
        <div className="flex items-start gap-3.5">
            <div className="flex w-24 shrink-0 flex-col gap-1.5">
                <BookCover
                    src={preview}
                    title={form.data.title || t('sem capa')}
                    className="w-24"
                />
                <Button
                    variant="ghost"
                    onClick={onToggleCover}
                    aria-expanded={coverOpen}
                    className="h-8 px-3 text-xs text-link"
                >
                    {t('Trocar capa')}
                </Button>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <Field label={t('Título')} error={form.errors.title}>
                    <Input
                        required
                        value={form.data.title}
                        onChange={(event) =>
                            form.setData('title', event.target.value)
                        }
                        className="h-10 bg-bg font-semibold"
                    />
                </Field>
                <Field label={t('Subtítulo')} error={form.errors.subtitle}>
                    <Input
                        value={form.data.subtitle}
                        placeholder={t('opcional')}
                        onChange={(event) =>
                            form.setData('subtitle', event.target.value)
                        }
                        className="h-10 bg-bg text-sm"
                    />
                </Field>
            </div>
        </div>
    );
}
