import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Dialog } from '@/components/dialog';
import { Button, Field, Input } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { store, update } from '@/routes/bookshelves';

const MAX_NAME_LENGTH = 60;

export function ShelfNameDialog({
    shelf,
    onClose,
}: {
    /** The shelf being renamed; null creates a new one. */
    shelf: { id: number; name: string } | null;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const form = useForm({ name: shelf?.name ?? '' });

    function submit(event: FormEvent) {
        event.preventDefault();

        const options = { preserveScroll: true, onSuccess: onClose };

        if (shelf === null) {
            form.post(store.url(), options);
        } else {
            form.patch(update.url(shelf.id), options);
        }
    }

    return (
        <Dialog
            title={
                shelf === null ? t('Nova prateleira') : t('Renomear prateleira')
            }
            onClose={onClose}
        >
            <form onSubmit={submit} className="flex flex-col gap-4">
                <Field label={t('Nome')} error={form.errors.name}>
                    <Input
                        autoFocus
                        required
                        maxLength={MAX_NAME_LENGTH}
                        value={form.data.name}
                        onChange={(event) =>
                            form.setData('name', event.target.value)
                        }
                    />
                </Field>
                <div className="flex justify-end gap-2.5">
                    <Button variant="ghost" onClick={onClose}>
                        {t('Cancelar')}
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {t('Salvar')}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
