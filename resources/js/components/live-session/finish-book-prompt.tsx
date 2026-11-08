import { cardClass } from '@/components/card';
import { Button } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { formatStopwatch } from '@/lib/session';

type FinishBookPromptProps = {
    title: string;
    pages: number;
    seconds: number;
    disabled: boolean;
    onFinishBook: () => void;
    onFinishSessionOnly: () => void;
    onBack: () => void;
};

/** Shown on the last page: the reader decides whether the book is finished too. */
export function FinishBookPrompt({
    title,
    pages,
    seconds,
    disabled,
    onFinishBook,
    onFinishSessionOnly,
    onBack,
}: FinishBookPromptProps) {
    const { t } = useTranslation();

    return (
        <div
            role="group"
            aria-label={t('Terminar o livro')}
            className={cardClass('flex flex-col gap-4 px-6 py-5.5')}
        >
            <div className="flex flex-col gap-1">
                <p className="text-xl font-extrabold tracking-tight">
                    {t('Você chegou à última página de :title.', { title })}
                </p>
                <p className="text-sm font-semibold text-secondary">
                    {t(
                        ':pages págs em :time nesta sessão. Quer marcar o livro como terminado?',
                        { pages, time: formatStopwatch(seconds) },
                    )}
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <Button
                    disabled={disabled}
                    onClick={onFinishBook}
                    className="h-13 px-6"
                >
                    {t('Terminar sessão e o livro')}
                </Button>
                <Button
                    variant="ghost"
                    disabled={disabled}
                    onClick={onFinishSessionOnly}
                    className="h-13 px-6 font-extrabold"
                >
                    {t('Só a sessão')}
                </Button>
                <span className="flex-1" />
                <button
                    type="button"
                    onClick={onBack}
                    className="h-13 px-3 text-[13px] font-bold text-link hover:underline"
                >
                    {t('voltar')}
                </button>
            </div>
        </div>
    );
}
