import { Dialog, DialogChoice } from '@/components/dialog';
import { useTranslation } from '@/hooks/use-translation';
import type { ReadingHistory } from '@/types';
import { CancelButton } from './cancel-button';

export function BackToReadingDialog({
    title,
    reading,
    onReread,
    onCorrect,
    onClose,
}: {
    title: string;
    reading: ReadingHistory;
    onReread: () => void;
    onCorrect: () => void;
    onClose: () => void;
}) {
    const { t, plural, shortDate, ordinal } = useTranslation();
    const summary = [
        reading.days && plural(reading.days, 'dia', 'dias'),
        reading.rating && '★'.repeat(reading.rating),
    ]
        .filter(Boolean)
        .join(', ');

    return (
        <Dialog
            title={`## ${t('voltar a ler :title?', { title })}`}
            onClose={onClose}
        >
            <p className="text-sm leading-relaxed text-secondary">
                {reading.finished_at
                    ? t(
                          'Você terminou este livro em :date. O que quer fazer?',
                          {
                              date: shortDate(reading.finished_at),
                          },
                      )
                    : t('Você terminou este livro. O que quer fazer?')}
            </p>
            <DialogChoice
                autoFocus
                recommended
                title={t('Ler de novo')}
                badge={t('recomendado')}
                description={t(
                    'Começa uma :next leitura hoje, da página 0. A :current:summary fica guardada no histórico.',
                    {
                        next: ordinal(reading.number + 1, 'feminine'),
                        current: ordinal(reading.number, 'feminine'),
                        summary: summary ? ` (${summary})` : '',
                    },
                )}
                onClick={onReread}
            />
            <DialogChoice
                title={t('Corrigir: ainda não terminei')}
                description={t(
                    'Reabre a mesma leitura na p. :page e apaga a data de término. Use se marcou como lido por engano.',
                    { page: reading.current_page },
                )}
                onClick={onCorrect}
            />
            <div className="flex justify-end">
                <CancelButton onClick={onClose} />
            </div>
        </Dialog>
    );
}
