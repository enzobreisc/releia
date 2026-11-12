import { router } from '@inertiajs/react';
import { Dialog, DialogList } from '@/components/dialog';
import { useTranslation } from '@/hooks/use-translation';
import { reopen } from '@/routes/readings';
import type { ReadingHistory } from '@/types';
import { CancelButton } from './cancel-button';
import { DangerButton } from './danger-button';
import { requestOptions } from './request-options';

/** Fix: the only path that clears the end date. */
export function CorrectDialog({
    reading,
    onClose,
}: {
    reading: ReadingHistory;
    onClose: () => void;
}) {
    const { t, shortDate } = useTranslation();
    const year = reading.finished_at?.slice(0, 4);

    return (
        <Dialog title={`## ${t('desmarcar como lido?')}`} onClose={onClose}>
            <p className="text-sm leading-relaxed text-secondary">
                {t('A leitura volta para Lendo, na p. :page. Isto apaga:', {
                    page: reading.current_page,
                })}
            </p>
            <DialogList
                items={[
                    reading.finished_at
                        ? t('a data de término (:date)', {
                              date: shortDate(reading.finished_at),
                          })
                        : t('a data de término'),
                    t('a contagem do livro nos lidos de :year', {
                        year: year ?? t('seu ano'),
                    }),
                ]}
            />
            <p className="text-xs text-muted">
                {t(
                    'Nota, resenha e sessões continuam. Para ler o livro outra vez, use "Ler de novo".',
                )}
            </p>
            <div className="flex justify-end gap-2">
                <CancelButton autoFocus onClick={onClose} />
                <DangerButton
                    onClick={() =>
                        router.post(
                            reopen(reading.id).url,
                            {},
                            {
                                ...requestOptions,
                                onSuccess: onClose,
                            },
                        )
                    }
                >
                    {t('Desmarcar como lido')}
                </DangerButton>
            </div>
        </Dialog>
    );
}
