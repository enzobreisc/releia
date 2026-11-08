import { useTranslation } from '@/hooks/use-translation';
import type { ReadingProgress } from '@/types';

export function PlannedReadingCard({
    number,
    progress,
    queuePosition,
}: {
    number: number;
    progress: ReadingProgress | null;
    queuePosition: number | null;
}) {
    const { t, plural, ordinal } = useTranslation();

    return (
        <section className="flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-strong p-6">
            <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
                <p className="text-[15px] font-bold">
                    {number > 1
                        ? t('Releitura planejada')
                        : t('Ainda não começou')}
                </p>
                <p className="text-[13px] font-medium text-muted">
                    {progress?.pages && progress.pace
                        ? `${t(
                              'No seu ritmo (:pace págs/dia), :pages páginas levam ~:duration.',
                              {
                                  pace: Math.round(progress.pace),
                                  pages: progress.pages,
                                  duration: plural(
                                      Math.ceil(
                                          (progress.pages -
                                              progress.current_page) /
                                              progress.pace,
                                      ),
                                      'dia',
                                      'dias',
                                  ),
                              },
                          )} `
                        : ''}
                    {queuePosition !== null
                        ? t('Está em :position na fila.', {
                              position: ordinal(queuePosition),
                          })
                        : t('Fora da fila.')}
                    {progress &&
                        progress.current_page > 0 &&
                        ` ${t('Parou na p. :page; ao começar, continua dela.', { page: progress.current_page })}`}
                </p>
            </div>
        </section>
    );
}
