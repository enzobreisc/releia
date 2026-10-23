import { Link, router } from '@inertiajs/react';
import { BookCover } from '@/components/book-cover';
import { cardClass } from '@/components/card';
import { Segmented } from '@/components/form';
import { HeatMap } from '@/components/heat-map';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { show as bookShow } from '@/routes/books';
import { index as statsIndex } from '@/routes/stats';
import type {
    CalendarDay,
    Forecast as ForecastData,
    Indicators,
    MonthlyBar,
    NamedCount,
    ReadingRef,
    Streak,
} from '@/types';

type StatsProps = {
    selected: string;
    years: number[];
    indicators: Indicators;
    monthly: MonthlyBar[];
    genres: NamedCount[];
    authors: NamedCount[];
    extremes: {
        fastest: ReadingRef | null;
        longest: ReadingRef | null;
    };
    best_month: { label: string; count: number } | null;
    streak: Streak;
    calendar: CalendarDay[];
    forecast: ForecastData | null;
};

const MONTH_BAR_MAX_HEIGHT = 140;

function Bars({
    items,
    translateLabels = false,
    labelWidth,
}: {
    items: NamedCount[];
    translateLabels?: boolean;
    labelWidth: string;
}) {
    const { t, plural, translateText } = useTranslation();

    if (items.length === 0) {
        return (
            <p className="text-sm text-muted">
                {t('Nada concluído neste período.')}
            </p>
        );
    }

    const max = Math.max(...items.map((item) => item.count));

    return (
        <div className="flex flex-col gap-3.5">
            {items.map((item) => {
                const label = translateLabels
                    ? translateText(item.label)
                    : item.label;

                return (
                    <div
                        key={item.label}
                        title={`${label}: ${plural(item.count, 'livro', 'livros')}`}
                        className="grid items-center gap-3"
                        style={{
                            gridTemplateColumns: `${labelWidth} 1fr 28px`,
                        }}
                    >
                        <span className="truncate text-[13px] font-bold">
                            {label}
                        </span>
                        <span className="h-2.5 rounded-r-[4px] bg-active">
                            <span
                                className="block h-2.5 rounded-r-[4px] bg-accent"
                                style={{
                                    width: `${(item.count / max) * 100}%`,
                                }}
                            />
                        </span>
                        <span className="text-right font-mono text-xs text-secondary">
                            {item.count}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function MonthlyChart({ bars }: { bars: MonthlyBar[] }) {
    const { t, plural } = useTranslation();
    const max = Math.max(1, ...bars.map((bar) => bar.count));
    const columns = {
        gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))`,
    };

    return (
        <div className="flex flex-col gap-2">
            <div
                role="img"
                aria-label={`${t('livros por mês')}: ${bars
                    .map((bar) => `${bar.label} ${bar.count}`)
                    .join(', ')}`}
                className="grid h-[180px] items-end gap-0.5 border-b border-strong px-0.5"
                style={columns}
            >
                {bars.map((bar) => (
                    <span
                        key={bar.label}
                        title={`${bar.label}: ${plural(bar.count, 'livro', 'livros')}`}
                        className="flex h-full flex-col items-center justify-end gap-1.5 px-1.5"
                    >
                        <span className="font-mono text-[11px] text-secondary">
                            {bar.count > 0 ? bar.count : ''}
                        </span>
                        <span
                            className={cn(
                                'w-full max-w-9 rounded-t-[4px]',
                                bar.count === max ? 'bg-accent' : 'bg-heat-2',
                            )}
                            style={{
                                height: `${bar.count > 0 ? Math.round((bar.count / max) * MONTH_BAR_MAX_HEIGHT) : 2}px`,
                            }}
                        />
                    </span>
                ))}
            </div>
            <div
                className="grid gap-0.5 px-0.5 text-center font-mono text-[11px] text-muted"
                style={columns}
            >
                {bars.map((bar) => (
                    <span key={bar.label}>{bar.label}</span>
                ))}
            </div>
        </div>
    );
}

function HighlightBook({
    label,
    reading,
}: {
    label: string;
    reading: ReadingRef | null;
}) {
    const { plural } = useTranslation();
    const note = reading
        ? [
              reading.days !== null
                  ? plural(reading.days, 'dia', 'dias')
                  : null,
              reading.pages !== null
                  ? plural(reading.pages, 'página', 'páginas')
                  : null,
          ]
              .filter(Boolean)
              .join(' · ')
        : '';
    const body = (
        <>
            {reading && (
                <BookCover
                    src={reading.cover_url}
                    title={reading.title}
                    className="w-10"
                />
            )}
            <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-xs font-bold text-muted first-letter:uppercase">
                    {label}
                </span>
                <span className="text-[15px] font-extrabold">
                    {reading?.title ?? '—'}
                </span>
                {note && (
                    <span className="font-mono text-xs text-muted">{note}</span>
                )}
            </span>
        </>
    );
    const className = cardClass('flex items-center gap-3.5 p-4.5');

    return reading ? (
        <Link href={bookShow.url(reading.id)} className={className}>
            {body}
        </Link>
    ) : (
        <div className={className}>{body}</div>
    );
}

function Forecast({ forecast }: { forecast: ForecastData }) {
    const { t, plural } = useTranslation();
    const scale = Math.max(forecast.goal ?? 0, forecast.projection, 1);

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
                            style={{
                                width: `${(forecast.books / scale) * 100}%`,
                            }}
                        />
                        <span
                            className="absolute -top-1 h-4 w-0.5 bg-accent"
                            style={{
                                left: `${(forecast.projection / scale) * 100}%`,
                            }}
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

const sectionClass = 'flex flex-col gap-4 rounded-lg p-6';

export default function Stats({
    selected,
    years,
    indicators,
    monthly,
    genres,
    authors,
    extremes,
    best_month,
    streak,
    calendar,
    forecast,
}: StatsProps) {
    const { t, plural, languageTag } = useTranslation();
    const formatNumber = (value: number | null, digits = 0) =>
        value === null
            ? '—'
            : value.toLocaleString(languageTag, {
                  maximumFractionDigits: digits,
              });
    const kpis = [
        {
            label: t('livros lidos'),
            value: formatNumber(indicators.books_read),
            note:
                indicators.rereads > 0
                    ? t('inclui :rereads', {
                          rereads: plural(
                              indicators.rereads,
                              'releitura',
                              'releituras',
                          ),
                      })
                    : undefined,
        },
        {
            label: t('páginas lidas'),
            value: formatNumber(indicators.pages_read),
        },
        {
            label: t('páginas por dia'),
            value: formatNumber(indicators.pages_per_day, 1),
            note: t(':pages nos dias com leitura', {
                pages: formatNumber(indicators.pages_per_reading_day, 1),
            }),
        },
        {
            label: t('dias por livro'),
            value: formatNumber(indicators.days_per_book, 1),
        },
    ];

    const periods = [
        ...years.map((year) => ({ value: String(year), label: String(year) })),
        { value: 'all', label: t('Todo o histórico') },
    ];

    return (
        <>
            <PageHeader
                title={t('Estatísticas')}
                actions={
                    <Segmented
                        options={periods}
                        value={selected}
                        onChange={(period) =>
                            router.get(
                                statsIndex.url(),
                                { year: period },
                                { preserveScroll: true, replace: true },
                            )
                        }
                    />
                }
            />

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3.5">
                {kpis.map((kpi) => (
                    <div
                        key={kpi.label}
                        className={cardClass('flex flex-col gap-1.5 p-5')}
                    >
                        <span className="text-xs font-bold text-muted">
                            {kpi.label}
                        </span>
                        <span className="text-[40px] leading-none font-extrabold tracking-tighter">
                            {kpi.value}
                        </span>
                        {kpi.note && (
                            <span className="font-mono text-xs text-muted">
                                {kpi.note}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {forecast && <Forecast forecast={forecast} />}

            <section className={cardClass(sectionClass)}>
                <div className="flex items-baseline justify-between">
                    <SectionTitle>{t('livros por mês')}</SectionTitle>
                    <span className="font-mono text-xs text-muted">
                        {plural(
                            monthly.reduce((sum, bar) => sum + bar.count, 0),
                            'livro',
                            'livros',
                        )}
                    </span>
                </div>
                <MonthlyChart bars={monthly} />
            </section>

            <div className="flex flex-wrap gap-3.5">
                <section
                    className={cardClass(
                        `${sectionClass} min-w-0 flex-[1_1_300px]`,
                    )}
                >
                    <SectionTitle>{t('gêneros mais lidos')}</SectionTitle>
                    <Bars items={genres} translateLabels labelWidth="110px" />
                </section>
                <section
                    className={cardClass(
                        `${sectionClass} min-w-0 flex-[1_1_300px]`,
                    )}
                >
                    <SectionTitle>{t('autores mais lidos')}</SectionTitle>
                    <Bars items={authors} labelWidth="150px" />
                </section>
            </div>

            <section className="flex flex-col gap-3.5">
                <SectionTitle>{t('destaques')}</SectionTitle>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-3.5">
                    <HighlightBook
                        label={t('mais rápido')}
                        reading={extremes.fastest}
                    />
                    <HighlightBook
                        label={t('mais longo')}
                        reading={extremes.longest}
                    />
                    <div
                        className={cardClass(
                            'flex flex-col justify-center gap-0.5 p-4.5',
                        )}
                    >
                        <span className="text-xs font-bold text-muted first-letter:uppercase">
                            {t('melhor mês')}
                        </span>
                        <span className="text-[22px] font-extrabold">
                            {best_month?.label ?? '—'}
                        </span>
                        {best_month && (
                            <span className="font-mono text-xs text-muted">
                                {plural(best_month.count, 'livro', 'livros')}
                            </span>
                        )}
                    </div>
                </div>
            </section>

            <section className={cardClass(sectionClass)}>
                <div className="flex flex-wrap items-baseline justify-between gap-2.5">
                    <SectionTitle>{t('dias em que você leu')}</SectionTitle>
                    <span className="text-[13px] font-semibold text-muted">
                        {t('Maior sequência:')}{' '}
                        <span className="text-text">
                            {plural(streak.longest, 'dia', 'dias')}
                        </span>{' '}
                        · {t('Sequência atual:')}{' '}
                        <span className="text-text">{streak.current}</span>
                    </span>
                </div>
                <HeatMap days={calendar} showLegend />
            </section>
        </>
    );
}
