import { cardClass } from '@/components/card';
import { calculateForecastBars } from '@/lib/forecast';
import { useTranslation } from '@/hooks/use-translation';
import type { Forecast } from '@/types';

export function ForecastBanner({ forecast }: { forecast: Forecast }) {
    const { t, plural } = useTranslation();
    const { booksPercent, projectionPercent } = calculateForecastBars(forecast);

    return (
        <section
            aria-label={t('Previsão para o ano:')}
            className={cardClass(
                'flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-5',
            )}
        >
            <span className="text-[15px] font-semibold text-secondary">
                {t('Previsão para o ano:')}{' '}
                <span className="text-[22px] font-extrabold text-text">
                    {plural(forecast.projection, 'livro', 'livros')}
                </span>{' '}
                {t('no ritmo atual')}
            </span>
            {forecast.goal !== null && (
                <>
                    <span className="relative h-2 min-w-[200px] flex-1 rounded-[4px] bg-border">
                        <span
                            className="absolute top-0 left-0 h-2 rounded-[4px] bg-text"
                            style={{ width: `${booksPercent}%` }}
                        />
                        <span
                            className="absolute -top-1 h-4 w-0.5 bg-accent"
                            style={{ left: `${projectionPercent}%` }}
                        />
                    </span>
                    <span className="font-mono text-xs text-muted">
                        {t('meta de')} {forecast.goal}
                    </span>
                </>
            )}
        </section>
    );
}
