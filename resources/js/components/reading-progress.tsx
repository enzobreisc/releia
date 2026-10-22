import type { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import type { ReadingProgress } from '@/types';

/** Progress bar: dark track, light fill. */
export function ProgressBar({
    percent,
    className,
}: {
    percent: number | null;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'h-1.5 overflow-hidden rounded-full bg-border',
                className,
            )}
        >
            <div
                className="h-full rounded-full bg-text"
                style={{ width: `${percent ?? 0}%` }}
            />
        </div>
    );
}

/** "p. 40 of 300 · 13% · 8 days left at your pace". */
export function progressText(
    progress: ReadingProgress,
    { t, plural }: Pick<ReturnType<typeof useTranslation>, 't' | 'plural'>,
): string {
    const parts: string[] = [
        progress.pages === null
            ? t('pág. :page', { page: progress.current_page })
            : t('pág. :page de :pages', {
                  page: progress.current_page,
                  pages: progress.pages,
              }),
    ];

    if (progress.percent !== null) {
        parts.push(`${progress.percent}%`);
    }

    if (progress.days_left !== null) {
        parts.push(
            t('faltam :duration no seu ritmo', {
                duration: plural(progress.days_left, 'dia', 'dias'),
            }),
        );
    } else if (progress.pace === null && progress.pages !== null) {
        parts.push(t('sem sessões para estimar o ritmo'));
    }

    return parts.join(' · ');
}
