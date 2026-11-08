import { Button } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import type { Saved } from './types';

export function DonePhase({
    saved,
    onClose,
}: {
    saved: Saved;
    onClose: () => void;
}) {
    const { t } = useTranslation();

    return (
        <section
            aria-label={t('Sessão salva')}
            className="flex flex-1 flex-col items-start gap-2.5"
        >
            <span className="text-xs font-extrabold tracking-widest text-link uppercase in-data-mobile:text-sm">
                {t('Terminou!')}
            </span>
            <span className="text-[44px] leading-none font-extrabold tracking-tighter">
                {t(':pages págs hoje', { pages: saved.pages })}
            </span>
            <span className="font-mono text-[13px] text-secondary in-data-mobile:text-sm">
                {saved.minutes !== null &&
                    `${t('em :minutes min', { minutes: saved.minutes })} · `}
                {t('agora na p. :page', { page: saved.page_to })}
            </span>
            <span className="font-mono text-[11px] text-accent">
                {saved.hash} · {saved.title}
            </span>
            <span className="text-[13px] font-semibold text-muted in-data-mobile:text-sm">
                {t('a data é hoje; ajuste no app se precisar')}
            </span>
            <Button
                variant="ghost"
                autoFocus
                onClick={onClose}
                className="mt-auto h-12 self-stretch in-data-mobile:h-14 in-data-mobile:text-base"
            >
                {t('Fechar')}
            </Button>
        </section>
    );
}
