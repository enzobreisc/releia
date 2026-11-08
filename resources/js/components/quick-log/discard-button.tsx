import { useState } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { discardTimer } from './session-requests';

/** Two taps to discard: confirm() disappears with the menu bar window. */
export function DiscardButton() {
    const { t } = useTranslation();
    const [confirming, setConfirming] = useState(false);

    return (
        <button
            type="button"
            onClick={() => (confirming ? discardTimer() : setConfirming(true))}
            onBlur={() => setConfirming(false)}
            className={cn(
                'h-9 text-[13px] font-bold in-data-mobile:h-11 in-data-mobile:text-sm',
                confirming ? 'text-danger' : 'text-muted hover:text-text',
            )}
        >
            {confirming ? t('confirmar: descartar sem salvar') : t('descartar')}
        </button>
    );
}
