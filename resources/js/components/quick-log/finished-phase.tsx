import { Button } from '@/components/form';
import { StarRating } from '@/components/star-rating';
import { useBookRating } from '@/hooks/use-book-rating';
import { useTranslation } from '@/hooks/use-translation';
import { RATING_STAR_SIZE } from './constants';
import { startBook } from './session-requests';
import type { Saved } from './types';

/** Session that reached the last page: the book ends here, with a rating and the next in the queue. */
export function FinishedPhase({
    saved,
    onClose,
}: {
    saved: Saved;
    onClose: () => void;
}) {
    const { t, plural } = useTranslation();
    const { rating, rate } = useBookRating(saved.book_id);
    const next = saved.next;

    return (
        <section
            aria-label={t('Sessão salva')}
            className="flex flex-1 flex-col items-start gap-3"
        >
            <span className="text-xs font-extrabold tracking-widest text-link uppercase in-data-mobile:text-sm">
                {t('Terminou!')}
            </span>
            <span className="text-[28px] leading-tight font-extrabold tracking-tight">
                {saved.title}
            </span>
            <span className="font-mono text-[13px] text-secondary in-data-mobile:text-sm">
                {saved.days !== null &&
                    `${plural(saved.days, 'dia', 'dias')} · `}
                +{t(':pages págs hoje', { pages: saved.pages })}
            </span>
            <StarRating
                value={rating}
                size={RATING_STAR_SIZE}
                onChange={rate}
            />
            <span className="text-[13px] font-semibold text-muted in-data-mobile:text-sm">
                {t('a data é hoje; ajuste no app se precisar')}
            </span>
            <div className="mt-auto flex w-full flex-col gap-2">
                {next && (
                    <Button
                        autoFocus
                        onClick={() => {
                            startBook(next.id);
                            onClose();
                        }}
                        className="h-12 in-data-mobile:h-14 in-data-mobile:text-base"
                    >
                        {t('Começar :title, o próximo', {
                            title: next.title,
                        })}
                    </Button>
                )}
                <Button
                    variant="ghost"
                    autoFocus={!next}
                    onClick={onClose}
                    className="h-12 in-data-mobile:h-14 in-data-mobile:text-base"
                >
                    {t('Fechar')}
                </Button>
            </div>
        </section>
    );
}
