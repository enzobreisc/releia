import { useTranslation } from '@/hooks/use-translation';

/**
 * The book in three parts: what was read before this session, what this session
 * read and what is left. Needs the book's page count.
 */
export function SessionProgressBar({
    startPage,
    page,
    pages,
}: {
    startPage: number;
    page: number;
    pages: number;
}) {
    const { t } = useTranslation();
    const percent = Math.round((page / pages) * 100);

    return (
        <div className="flex flex-col gap-2.5">
            <div
                role="img"
                aria-label={t(
                    'Página :page de :pages. Nesta sessão: páginas :from a :to.',
                    { page, pages, from: startPage, to: page },
                )}
                className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
            >
                <span
                    className="bg-heat-2"
                    style={{ flex: `${startPage} 1 0` }}
                />
                <span
                    className="bg-accent"
                    style={{ flex: `${page - startPage} 1 0` }}
                />
                <span
                    className="bg-border"
                    style={{ flex: `${pages - page} 1 0` }}
                />
            </div>
            <div className="flex justify-between font-mono text-xs text-muted">
                <span>{t('começou na p. :page', { page: startPage })}</span>
                <span className="text-text">
                    {t('p. :page de :pages · :percent%', {
                        page,
                        pages,
                        percent,
                    })}
                </span>
            </div>
        </div>
    );
}
