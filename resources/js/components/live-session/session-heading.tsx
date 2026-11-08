import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';

type SessionHeadingProps = {
    title: string;
    authors: string;
    isPaused: boolean;
};

export function SessionHeading({
    title,
    authors,
    isPaused,
}: SessionHeadingProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-2.5">
            <span
                className={cn(
                    'flex items-center gap-2 text-xs font-extrabold tracking-widest uppercase',
                    isPaused ? 'text-secondary' : 'text-accent',
                )}
            >
                <span
                    className={cn(
                        'size-1.75 rounded-full bg-current',
                        !isPaused && 'animate-pulse',
                    )}
                />
                {isPaused ? t('pausado') : t('lendo')}
            </span>
            <h1 className="text-[clamp(2.5rem,4.5vw,4rem)] leading-[0.95] font-extrabold tracking-[-0.045em]">
                {title}
            </h1>
            <p className="text-xl font-semibold text-secondary">{authors}</p>
        </div>
    );
}
