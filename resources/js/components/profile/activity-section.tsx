import { Link } from '@inertiajs/react';
import { cardClass } from '@/components/card';
import { SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { show as bookShow } from '@/routes/books';
import type { ActivityItem } from './types';

type Translator = ReturnType<typeof useTranslation>;

const ACTIVITY_DOT_CLASSES: Record<ActivityItem['type'], string> = {
    finished: 'bg-text',
    session: 'bg-accent',
    added: 'bg-muted',
    reread: 'bg-accent',
};

function describe(item: ActivityItem, { t, plural }: Translator) {
    switch (item.type) {
        case 'finished':
            return {
                verb: t('Terminou'),
                extra: item.rating
                    ? ` · ${t('nota :rating', { rating: item.rating })}`
                    : '',
            };
        case 'session':
            return {
                verb: t('Leu'),
                extra: ` · +${plural(item.pages, 'pág', 'págs')}`,
            };
        case 'added':
            return { verb: t('Adicionou'), extra: ` ${t('à biblioteca')}` };
        case 'reread':
            return { verb: t('Começou a reler'), extra: '' };
    }
}

export function ActivitySection({ activity }: { activity: ActivityItem[] }) {
    const translator = useTranslation();
    const { t, shortDate } = translator;

    return (
        <section
            aria-label={t('Atividade recente')}
            className="flex flex-col gap-3.5"
        >
            <SectionTitle>{t('Atividade recente')}</SectionTitle>
            {activity.length === 0 ? (
                <p className="text-sm text-muted">
                    {t('Nenhuma atividade ainda.')}
                </p>
            ) : (
                <ol className={cardClass('flex flex-col overflow-hidden')}>
                    {activity.map((item, index) => {
                        const { verb, extra } = describe(item, translator);

                        return (
                            <li
                                key={`${item.type}-${item.date}-${index}`}
                                className="flex items-center gap-3.5 border-b border-border px-4.5 py-3.5 last:border-b-0"
                            >
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'size-2 shrink-0 rounded-full',
                                        ACTIVITY_DOT_CLASSES[item.type],
                                    )}
                                />
                                <span className="min-w-0 flex-1 text-sm font-medium text-secondary">
                                    {verb}{' '}
                                    <Link
                                        href={bookShow.url(item.book_id)}
                                        className="font-extrabold text-text hover:underline"
                                    >
                                        {item.title}
                                    </Link>
                                    {extra}
                                </span>
                                <span className="shrink-0 font-mono text-[11px] text-muted">
                                    {shortDate(item.date)}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
}
