import { router } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { discard } from '@/routes/live-session';

/** Two taps to discard, so a stray click does not lose the session. */
export function DiscardSessionButton() {
    const { t } = useTranslation();
    const [isConfirming, setConfirming] = useState(false);

    return (
        <button
            type="button"
            onClick={() =>
                isConfirming
                    ? router.delete(discard.url())
                    : setConfirming(true)
            }
            onBlur={() => setConfirming(false)}
            className={cn(
                'h-9 text-[13px] font-bold',
                isConfirming ? 'text-danger' : 'text-muted hover:text-text',
            )}
        >
            {isConfirming
                ? t('confirmar: descartar sem salvar')
                : t('descartar')}
        </button>
    );
}
