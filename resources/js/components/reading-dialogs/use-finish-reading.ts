import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { today } from '@/lib/dates';
import { finish } from '@/routes/readings';
import type { ReadingHistory } from '@/types';
import { daysBetween } from './days-between';
import { requestOptions } from './request-options';
import { useSubmitShortcut } from './use-submit-shortcut';

export type FinishChoice = 'today' | 'yesterday' | 'other' | 'undated';

export function useFinishReading(reading: ReadingHistory, onClose: () => void) {
    const { t, shortDate } = useTranslation();
    const [choice, setChoice] = useState<FinishChoice>('today');
    const form = useForm({
        finished_on: today(),
        rating: reading.rating ?? 0,
        line: '',
    });

    const undated = choice === 'undated';
    const date = undated
        ? null
        : choice === 'today'
          ? today()
          : choice === 'yesterday'
            ? today(-1)
            : form.data.finished_on;
    const minimum = [reading.started_at, reading.last_session_on]
        .filter((value): value is string => value !== null)
        .sort()
        .at(-1);
    const clientError =
        date === null
            ? null
            : date > today()
              ? t('O término não pode ser depois de hoje.')
              : minimum && date < minimum
                ? reading.last_session_on === minimum
                    ? t(
                          'A última sessão foi em :date. Escolha essa data ou depois.',
                          { date: shortDate(minimum) },
                      )
                    : t(
                          'A leitura começou em :date. Escolha essa data ou depois.',
                          { date: shortDate(minimum) },
                      )
                : null;
    const days =
        reading.started_at && date !== null
            ? daysBetween(reading.started_at, date)
            : null;
    const pace =
        days && reading.current_page
            ? Math.round(reading.current_page / days)
            : null;

    function save() {
        if (clientError) {
            return;
        }

        form.transform((data) => ({
            ...data,
            finished_on: date,
            undated,
            rating: data.rating || null,
        }));
        form.post(finish(reading.id).url, {
            ...requestOptions,
            onSuccess: onClose,
        });
    }

    function skip() {
        router.post(
            finish(reading.id).url,
            { finished_on: today() },
            { ...requestOptions, onSuccess: onClose },
        );
    }

    useSubmitShortcut(save, !form.processing);

    return {
        choice,
        setChoice,
        form,
        undated,
        minimum,
        clientError,
        days,
        pace,
        save,
        skip,
    };
}
