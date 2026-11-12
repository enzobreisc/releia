import { router } from '@inertiajs/react';
import { Dialog, DialogList } from '@/components/dialog';
import { useTranslation } from '@/hooks/use-translation';
import { destroy as destroyReading } from '@/routes/readings';
import type { ReadingHistory } from '@/types';
import { CancelButton } from './cancel-button';
import { DangerButton } from './danger-button';
import { requestOptions } from './request-options';

export function DeleteReadingDialog({
    reading,
    title,
    onClose,
}: {
    reading: ReadingHistory;
    title: string;
    onClose: () => void;
}) {
    const { t, plural, ordinal } = useTranslation();
    const readingOrdinal = ordinal(reading.number, 'feminine');

    return (
        <Dialog
            title={`## ${t('apagar a :ordinal leitura?', { ordinal: readingOrdinal })}`}
            onClose={onClose}
        >
            <p className="text-sm leading-relaxed text-secondary">
                {t('A :ordinal leitura de :title sai do histórico com:', {
                    ordinal: readingOrdinal,
                    title,
                })}
            </p>
            <DialogList
                items={[
                    plural(reading.sessions_count, 'sessão', 'sessões'),
                    reading.rating
                        ? t('a nota (:stars)', {
                              stars: '★'.repeat(reading.rating),
                          })
                        : t('sem nota'),
                    reading.review ? t('a resenha') : t('sem resenha'),
                ]}
            />
            <div className="flex justify-end gap-2">
                <CancelButton autoFocus onClick={onClose} />
                <DangerButton
                    onClick={() =>
                        router.visit(destroyReading(reading.id), {
                            ...requestOptions,
                            onSuccess: onClose,
                        })
                    }
                >
                    {t('Apagar leitura')}
                </DangerButton>
            </div>
        </Dialog>
    );
}
