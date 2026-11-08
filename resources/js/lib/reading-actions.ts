import { router } from '@inertiajs/react';
import type { Status } from '@/components/status';
import type { DialogState } from '@/hooks/use-book-dialogs';
import type { TranslationKey } from '@/lib/i18n';
import { reading as readingRoute } from '@/routes/books';

const PRESERVE_PAGE_STATE = { preserveScroll: true, preserveState: true };

type PrimaryAction = { label: TranslationKey; run: () => void };

export function createReadingActions(
    bookId: number,
    status: Status,
    openDialog: (dialog: DialogState) => void,
) {
    function setStatus(next: Status) {
        router.patch(
            readingRoute.url(bookId),
            { status: next },
            PRESERVE_PAGE_STATE,
        );
    }

    function rate(rating: number | null) {
        router.patch(readingRoute.url(bookId), { rating }, PRESERVE_PAGE_STATE);
    }

    function pickStatus(next: Status) {
        if (next === status) {
            return;
        }

        if (status === 'read' && next === 'reading') {
            openDialog({ kind: 'back' });
        } else if (next === 'read') {
            openDialog({ kind: 'finish' });
        } else if (next === 'abandoned') {
            openDialog({ kind: 'abandon' });
        } else {
            setStatus(next);
        }
    }

    const primaryActions: Record<Status, PrimaryAction> = {
        want_to_read: {
            label: 'Começar a ler',
            run: () => setStatus('reading'),
        },
        reading: {
            label: 'Terminei',
            run: () => openDialog({ kind: 'finish' }),
        },
        read: {
            label: 'Ler de novo',
            run: () => openDialog({ kind: 'reread' }),
        },
        abandoned: { label: 'Retomar', run: () => setStatus('reading') },
    };

    return { primaryAction: primaryActions[status], pickStatus, rate };
}
