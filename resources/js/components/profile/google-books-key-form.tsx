import { router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button, Field, Input } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { destroy, update } from '@/routes/profile/google-books-key';
import type { GoogleBooksKeyStatus } from './types';

export function GoogleBooksKeyForm({
    status,
}: {
    status: GoogleBooksKeyStatus;
}) {
    const { t } = useTranslation();
    const form = useForm({ google_books_key: '' });
    const isSaved = status.saved_ending !== null;

    const save = (event: FormEvent) => {
        event.preventDefault();
        form.put(update.url(), {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <form onSubmit={save} className="flex flex-col gap-2">
            <Field
                label={t('Chave do Google Books')}
                error={form.errors.google_books_key}
            >
                <Input
                    type="password"
                    autoComplete="off"
                    value={form.data.google_books_key}
                    onChange={(event) =>
                        form.setData('google_books_key', event.target.value)
                    }
                    placeholder={t('Cole a chave aqui')}
                />
            </Field>

            <KeyStatus status={status} />

            <div className="flex gap-2">
                <Button
                    type="submit"
                    variant="ghost"
                    disabled={
                        form.processing || form.data.google_books_key === ''
                    }
                >
                    {t('Salvar chave')}
                </Button>
                {isSaved && (
                    <Button
                        variant="danger"
                        onClick={() =>
                            router.delete(destroy.url(), {
                                preserveScroll: true,
                            })
                        }
                    >
                        {t('Remover')}
                    </Button>
                )}
            </div>
        </form>
    );
}

function KeyStatus({ status }: { status: GoogleBooksKeyStatus }) {
    const { t } = useTranslation();
    const message = () => {
        if (status.saved_ending !== null) {
            return t('Chave salva, terminada em :ending.', {
                ending: status.saved_ending,
            });
        }

        if (status.has_environment_key) {
            return t('Usando a chave configurada no ambiente.');
        }

        return t(
            'Sem chave, o Google Books usa uma cota compartilhada e costuma falhar.',
        );
    };

    return (
        <p role="status" className="text-xs leading-normal text-muted">
            {message()}
        </p>
    );
}
