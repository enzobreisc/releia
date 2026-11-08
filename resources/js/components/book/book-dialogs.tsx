import {
    AbandonDialog,
    BackToReadingDialog,
    CorrectDialog,
    DatesDialog,
    DeleteReadingDialog,
    FinishDialog,
    RemoveBookDialog,
    RereadDialog,
} from '@/components/reading-dialogs';
import type { Removal } from '@/components/reading-dialogs';
import type { DialogState } from '@/hooks/use-book-dialogs';
import type { BookDetail, ReadingHistory } from '@/types';

export function BookDialogs({
    book,
    dialog,
    current,
    previous,
    queuePosition,
    removal,
    onOpenDialog,
    onClose,
}: {
    book: BookDetail;
    dialog: DialogState | null;
    current: ReadingHistory | null;
    previous: ReadingHistory | null;
    queuePosition: number | null;
    removal: Removal;
    onOpenDialog: (dialog: DialogState) => void;
    onClose: () => void;
}) {
    return (
        <>
            {dialog?.kind === 'finish' && current && (
                <FinishDialog
                    title={book.title}
                    reading={current}
                    previous={previous}
                    onClose={onClose}
                />
            )}
            {dialog?.kind === 'abandon' && current && (
                <AbandonDialog
                    title={book.title}
                    reading={current}
                    pages={book.pages}
                    onClose={onClose}
                />
            )}
            {dialog?.kind === 'reread' && (
                <RereadDialog bookId={book.id} onClose={onClose} />
            )}
            {dialog?.kind === 'back' && current && (
                <BackToReadingDialog
                    title={book.title}
                    reading={current}
                    onReread={() => onOpenDialog({ kind: 'reread' })}
                    onCorrect={() => onOpenDialog({ kind: 'correct' })}
                    onClose={onClose}
                />
            )}
            {dialog?.kind === 'correct' && current && (
                <CorrectDialog reading={current} onClose={onClose} />
            )}
            {dialog?.kind === 'dates' && (
                <DatesDialog reading={dialog.reading} onClose={onClose} />
            )}
            {dialog?.kind === 'deleteReading' && (
                <DeleteReadingDialog
                    reading={dialog.reading}
                    title={book.title}
                    onClose={onClose}
                />
            )}
            {dialog?.kind === 'remove' && (
                <RemoveBookDialog
                    bookId={book.id}
                    title={book.title}
                    removal={removal}
                    queued={queuePosition !== null}
                    onClose={onClose}
                />
            )}
        </>
    );
}
