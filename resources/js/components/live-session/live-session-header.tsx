import { Link } from '@inertiajs/react';
import { ArrowLeftIcon } from '@/components/icons';
import { useTranslation } from '@/hooks/use-translation';

type LiveSessionHeaderProps = {
    bookUrl: string;
    startedAt: string;
    now: Date;
};

export function LiveSessionHeader({
    bookUrl,
    startedAt,
    now,
}: LiveSessionHeaderProps) {
    const { t, clockTime } = useTranslation();

    return (
        <header className="relative flex items-center justify-between px-14 pt-9 app-drag">
            <Link
                href={bookUrl}
                className="flex h-11 items-center gap-2.5 text-[13px] font-semibold text-secondary app-no-drag hover:text-text"
            >
                <ArrowLeftIcon />
                {t('Sair da sessão')}
                <kbd className="font-mono text-[11px] font-normal text-muted">
                    esc
                </kbd>
            </Link>
            <div className="flex items-baseline gap-4 font-mono">
                <span className="text-xs text-muted">
                    {t('iniciada às :time', {
                        time: clockTime(new Date(startedAt)),
                    })}
                </span>
                <span className="text-lg font-medium">{clockTime(now)}</span>
            </div>
        </header>
    );
}
