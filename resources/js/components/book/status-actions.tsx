import { BookMenu } from '@/components/book/book-menu';
import {
    FIRST_READING_NUMBER,
    STAR_RATING_SIZE,
} from '@/components/book/constants';
import { StatusPills } from '@/components/book/status-pills';
import { Button } from '@/components/form';
import { QueueButton } from '@/components/queue-button';
import { StarRating } from '@/components/star-rating';
import type { Status } from '@/components/status';
import type { DialogState } from '@/hooks/use-book-dialogs';
import { createReadingActions } from '@/lib/reading-actions';
import { useTranslation } from '@/hooks/use-translation';
import type { BookDetail, ReadingHistory } from '@/types';

export function StatusActions({
    book,
    status,
    current,
    queuePosition,
    canMoveToShopping,
    onOpenDialog,
    onEdit,
}: {
    book: BookDetail;
    status: Status;
    current: ReadingHistory | null;
    queuePosition: number | null;
    canMoveToShopping: boolean;
    onOpenDialog: (dialog: DialogState) => void;
    onEdit: () => void;
}) {
    const { t } = useTranslation();
    const { primaryAction, pickStatus, rate } = createReadingActions(
        book.id,
        status,
        onOpenDialog,
    );
    const number = current?.number ?? FIRST_READING_NUMBER;

    return (
        <div className="relative mt-1 flex flex-wrap items-center gap-3">
            <Button
                onClick={primaryAction.run}
                className="h-12 px-6.5 text-[15px]"
            >
                {t(primaryAction.label)}
            </Button>
            <StatusPills status={status} number={number} onPick={pickStatus} />
            {(status === 'read' || status === 'abandoned') && (
                <StarRating
                    value={book.reading?.rating ?? null}
                    onChange={rate}
                    size={STAR_RATING_SIZE}
                />
            )}
            {status === 'want_to_read' && (
                <QueueButton
                    bookId={book.id}
                    position={queuePosition}
                    className="h-12"
                />
            )}
            <BookMenu
                bookId={book.id}
                status={status}
                current={current}
                canMoveToShopping={canMoveToShopping}
                onOpenDialog={onOpenDialog}
                onEdit={onEdit}
            />
        </div>
    );
}
