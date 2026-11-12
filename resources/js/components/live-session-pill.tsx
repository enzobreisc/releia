import { Link } from '@inertiajs/react';
import { useElapsed } from '@/hooks/use-elapsed';
import { useTranslation } from '@/hooks/use-translation';
import { formatStopwatch } from '@/lib/session';
import { cn } from '@/lib/utils';
import { show } from '@/routes/live-session';
import type { HomeLiveSession } from '@/types';

export function LiveSessionPill({ session }: { session: HomeLiveSession }) {
    const { t } = useTranslation();
    const seconds = useElapsed(session.timer);
    const { paused, page } = session.timer;

    return (
        <Link
            href={show.url()}
            aria-label={t('Abrir a sessão em andamento')}
            className="flex h-11 items-center gap-3 rounded-full bg-elevated pr-2 pl-4 inset-ring inset-ring-strong hover:bg-active"
        >
            <span
                className={cn(
                    'flex items-center gap-1.75 text-[11px] font-extrabold tracking-widest uppercase',
                    paused ? 'text-secondary' : 'text-accent',
                )}
            >
                <span
                    className={cn(
                        'size-1.5 rounded-full bg-current',
                        !paused && 'animate-pulse',
                    )}
                />
                {paused ? t('pausada') : t('lendo')}
            </span>
            <span className="font-mono text-[15px] font-medium tabular-nums">
                {formatStopwatch(seconds)}
            </span>
            <span className="hidden max-w-48 truncate text-[13px] font-bold text-secondary sm:block">
                {session.title}{' '}
                <span className="font-mono font-normal text-muted">
                    {t('p. :page', { page })}
                </span>
            </span>
            <span className="flex h-7.5 items-center rounded-full bg-text px-3.5 text-xs font-extrabold text-bg">
                {t('Abrir')}
            </span>
        </Link>
    );
}
