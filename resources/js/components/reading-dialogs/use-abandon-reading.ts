import { router } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
import { abandon } from '@/routes/readings';
import type { ReadingHistory } from '@/types';
import { OTHER_REASON } from './abandon-reasons';
import { requestOptions } from './request-options';

export function useAbandonReading(
    reading: ReadingHistory,
    pages: number | null,
    onClose: () => void,
) {
    const { t } = useTranslation();
    const [choice, setChoice] = useState<TranslationKey | null>(null);
    const [other, setOther] = useState('');
    const [rate, setRate] = useState(false);
    const [rating, setRating] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);
    const percent = pages
        ? Math.round((reading.current_page / pages) * 100)
        : null;

    function submit() {
        router.post(
            abandon(reading.id).url,
            {
                reason:
                    choice === OTHER_REASON
                        ? other.trim() || null
                        : choice && t(choice),
                rating: rate ? rating : null,
            },
            {
                ...requestOptions,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: onClose,
            },
        );
    }

    return {
        choice,
        setChoice,
        other,
        setOther,
        rate,
        setRate,
        rating,
        setRating,
        processing,
        percent,
        submit,
    };
}
