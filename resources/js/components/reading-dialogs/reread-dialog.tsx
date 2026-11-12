import { router } from '@inertiajs/react';
import { Dialog, DialogChoice } from '@/components/dialog';
import { useTranslation } from '@/hooks/use-translation';
import { reread } from '@/routes/books';
import { CancelButton } from './cancel-button';
import { requestOptions } from './request-options';

export function RereadDialog({
    bookId,
    onClose,
}: {
    bookId: number;
    onClose: () => void;
}) {
    const { t } = useTranslation();

    function start(status: 'reading' | 'want_to_read') {
        router.post(
            reread(bookId).url,
            { status },
            { ...requestOptions, onSuccess: onClose },
        );
    }

    return (
        <Dialog title={`## ${t('ler de novo')}`} onClose={onClose}>
            <p className="text-sm leading-relaxed text-secondary">
                {t(
                    'Uma nova leitura, com sessões, nota e resenha próprias. A anterior fica no histórico.',
                )}
            </p>
            <DialogChoice
                autoFocus
                recommended
                title={t('Começar hoje')}
                description={t('Vai para Lendo, a partir da p. 0.')}
                onClick={() => start('reading')}
            />
            <DialogChoice
                title={t('Quero reler depois')}
                description={t('Vai para Quero ler e entra no fim da fila.')}
                onClick={() => start('want_to_read')}
            />
            <div className="flex justify-end">
                <CancelButton onClick={onClose} />
            </div>
        </Dialog>
    );
}
