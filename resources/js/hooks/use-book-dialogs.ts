import { useEffect, useState } from 'react';
import type { ReadingHistory } from '@/types';

export type DialogState =
    | { kind: 'finish' | 'abandon' | 'reread' | 'back' | 'correct' | 'remove' }
    | { kind: 'dates' | 'deleteReading'; reading: ReadingHistory };

export function useBookDialogs() {
    const [dialog, setDialog] = useState<DialogState | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.metaKey && event.key.toLowerCase() === 'e') {
                event.preventDefault();
                setIsEditing(true);
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return {
        dialog,
        openDialog: (next: DialogState) => setDialog(next),
        closeDialog: () => setDialog(null),
        isEditing,
        startEditing: () => setIsEditing(true),
        stopEditing: () => setIsEditing(false),
    };
}
