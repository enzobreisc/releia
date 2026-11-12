import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { today } from '@/lib/dates';
import { dates } from '@/routes/readings';
import type { ReadingHistory } from '@/types';
import { requestOptions } from './request-options';

export function useReadingDates(reading: ReadingHistory, onClose: () => void) {
    const { t, shortDate } = useTranslation();
    const closed = reading.status === 'read' || reading.status === 'abandoned';
    // Only a read reading can have no dates (read long ago).
    const canBeUndated = reading.status === 'read';
    const form = useForm({
        started_at:
            reading.started_at ??
            (canBeUndated && reading.finished_at === null ? '' : today()),
        finished_at: reading.finished_at ?? '',
        undated: canBeUndated && reading.finished_at === null,
    });
    const { started_at: start, finished_at: end, undated } = form.data;

    const error = undated
        ? null
        : closed
          ? end === ''
              ? t('Informe o término.')
              : end > today()
                ? t('O término não pode ser depois de hoje (:date).', {
                      date: shortDate(today()),
                  })
                : end < start
                  ? t('O término não pode ser antes do início.')
                  : reading.last_session_on && end < reading.last_session_on
                    ? t(
                          'A última sessão foi em :date. Escolha essa data ou depois.',
                          { date: shortDate(reading.last_session_on) },
                      )
                    : null
          : start > today()
            ? t('O início não pode ser depois de hoje.')
            : null;
    const earlySessions =
        start !== '' &&
        reading.first_session_on &&
        reading.first_session_on < start
            ? reading.sessions.filter((session) => session.read_on < start)
            : [];

    function save(event?: FormEvent) {
        event?.preventDefault();

        if (error) {
            return;
        }

        form.transform((data) => ({
            started_at: data.started_at || null,
            finished_at: closed && !data.undated ? data.finished_at : null,
        }));
        form.patch(dates(reading.id).url, {
            ...requestOptions,
            onSuccess: onClose,
        });
    }

    return {
        form,
        closed,
        canBeUndated,
        start,
        end,
        undated,
        error,
        earlySessions,
        save,
    };
}
