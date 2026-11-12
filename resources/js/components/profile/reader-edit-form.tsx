import { Button, Field, Input, Textarea } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import type { ReaderEditor } from '@/hooks/use-reader-editor';

export function ReaderEditForm({
    editor: { form, save, cancel },
}: {
    editor: ReaderEditor;
}) {
    const { t } = useTranslation();

    return (
        <form onSubmit={save} className="flex flex-col gap-3">
            <Field label={t('Nome')} error={form.errors.name}>
                <Input
                    autoFocus
                    value={form.data.name}
                    onChange={(event) =>
                        form.setData('name', event.target.value)
                    }
                    maxLength={60}
                />
            </Field>
            <Field label={t('Sobre você')} error={form.errors.bio}>
                <Textarea
                    rows={3}
                    value={form.data.bio}
                    onChange={(event) =>
                        form.setData('bio', event.target.value)
                    }
                    maxLength={160}
                    placeholder={t('O que você gosta de ler')}
                    className="min-h-0"
                />
            </Field>
            <div className="flex gap-2">
                <Button type="submit" disabled={form.processing}>
                    {t('Salvar')}
                </Button>
                <Button
                    variant="ghost"
                    onClick={cancel}
                    className="bg-transparent"
                >
                    {t('Cancelar')}
                </Button>
            </div>
        </form>
    );
}
