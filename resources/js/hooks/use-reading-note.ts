import { useTranslation } from '@/hooks/use-translation';
import type { ReadingRef } from '@/types';

export function useReadingNote(reading: ReadingRef | null): string {
    const { plural } = useTranslation();

    if (!reading) {
        return '';
    }

    return [
        reading.days !== null ? plural(reading.days, 'dia', 'dias') : null,
        reading.pages !== null
            ? plural(reading.pages, 'página', 'páginas')
            : null,
    ]
        .filter(Boolean)
        .join(' · ');
}
