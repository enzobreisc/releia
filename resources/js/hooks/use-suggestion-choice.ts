import { useState } from 'react';
import type { Choosing } from '@/components/suggestion-editions';

export function useSuggestionChoice() {
    const [open, setOpen] = useState(false);
    const [choosing, setChoosing] = useState<Choosing | null>(null);

    return {
        open,
        choosing,
        isVisible: open || choosing !== null,
        toggle: () => setOpen(!open),
        choose: setChoosing,
        close: () => {
            setChoosing(null);
            setOpen(false);
        },
    };
}

export type SuggestionChoice = ReturnType<typeof useSuggestionChoice>;
