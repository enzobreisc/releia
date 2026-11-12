import { Link, router } from '@inertiajs/react';
import { BookCover } from '@/components/book-cover';
import { Button, buttonClass } from '@/components/form';
import { SectionTitle } from '@/components/page-header';
import { ProgressBar } from '@/components/reading-progress';
import { useTranslation } from '@/hooks/use-translation';
import { show as showBook } from '@/routes/books';
import { start as startLiveSession } from '@/routes/live-session';
import type { ReadingSummary } from '@/types';

export function ReadingHero({
    item,
    hasLiveSession,
}: {
    item: ReadingSummary;
    hasLiveSession: boolean;
}) {
    const { t } = useTranslation();

    return (
        <section className="flex flex-wrap items-end gap-11">
            <Link
                href={showBook(item.book_id).url}
                aria-label={t('Abrir :title', { title: item.title })}
            >
                <BookCover
                    src={item.cover_url}
                    title={item.title}
                    className="w-50 shadow-hero"
                />
            </Link>
            <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4 pb-1">
                <SectionTitle>{t('lendo agora')}</SectionTitle>
                <p className="text-[clamp(44px,5vw,68px)] leading-[0.95] font-extrabold tracking-[-0.04em]">
                    {item.title}
                </p>
                {item.authors && (
                    <p className="text-lg font-semibold text-secondary">
                        {item.authors}
                    </p>
                )}
                <div className="mt-2 flex max-w-130 flex-col gap-2">
                    <ProgressBar percent={item.percent} />
                    <div className="flex justify-between font-mono text-[13px] text-muted">
                        <span>
                            {item.pages === null
                                ? t('pág. :page', { page: item.current_page })
                                : t('pág. :page de :pages', {
                                      page: item.current_page,
                                      pages: item.pages,
                                  })}
                        </span>
                        {item.percent !== null && <span>{item.percent}%</span>}
                    </div>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-3">
                    <Link
                        href={showBook(item.book_id).url}
                        className={buttonClass(
                            'primary',
                            'h-12 px-6.5 text-[15px]',
                        )}
                    >
                        {t('Registrar leitura')}
                    </Link>
                    {!item.finish_suggested && !hasLiveSession && (
                        <Button
                            variant="ghost"
                            onClick={() =>
                                router.post(startLiveSession.url(item.book_id))
                            }
                            className="h-12 px-6.5 text-[15px]"
                        >
                            {t('Iniciar sessão')}
                        </Button>
                    )}
                </div>
            </div>
        </section>
    );
}
