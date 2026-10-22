import { router } from '@inertiajs/react';
import { HeatMap } from '@/components/heat-map';
import { Field, Select } from '@/components/form';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { index as statsIndex } from '@/routes/stats';
import type {
    CalendarDay,
    Forecast,
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
    forecast: Forecast | null;
};

/** Horizontal bars proportional to the largest value. */
function Bars({
    items,
    translateLabels = false,
}: {
    items: NamedCount[];
    translateLabels?: boolean;
}) {
    const { t, translateText } = useTranslation();

    if (items.length === 0) {
        return (
            <p className="text-sm text-muted">
                {t('Nada concluído neste período.')}
            </p>
        );
    }

    const max = Math.max(...items.map((item) => item.count));

    return (
        <div className="flex flex-col gap-3">
            {items.map((item) => (
                <div key={item.label} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                        <span className="truncate">
                            {translateLabels
                                ? translateText(item.label)
                                : item.label}
                        </span>
                        <span className="font-mono text-muted">
                            {item.count}
                        </span>
                    </div>
                    <div className="h-2 rounded-sm bg-elevated">
                        <div
                            className="h-2 rounded-sm bg-primary"
                            style={{ width: `${(item.count / max) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Columns of finished books per month (or per year in the history). */
function MonthlyChart({ bars }: { bars: MonthlyBar[] }) {
    const max = Math.max(1, ...bars.map((bar) => bar.count));

    return (
        <div className="flex h-40 items-end gap-2">
            {bars.map((bar) => (
                <div
                    key={bar.label}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
                >
                    <span className="font-mono text-[11px] text-muted">
                        {bar.count > 0 ? bar.count : ''}
                    </span>
                    <div
                        title={`${bar.label}: ${bar.count}`}
                        className="w-full rounded-t-[3px] bg-primary"
                        style={{
                            height: `${(bar.count / max) * 100}%`,
                            minHeight: bar.count > 0 ? 4 : 0,
                        }}
                    />
                    <span className="text-[11px] text-muted">{bar.label}</span>
                </div>
            ))}
        </div>
    );
}

function Highlight({
    label,
    reading,
}: {
    label: string;
    reading: ReadingRef | null;
}) {
    const { plural } = useTranslation();

    return (
        <div className="flex flex-col gap-1">
            <span className="font-mono text-xs text-muted lowercase">
                {label}
            </span>
            {reading ? (
                <>
                    <span className="font-semibold">{reading.title}</span>
                    <span className="text-sm text-muted">
                        {reading.days !== null
                            ? plural(reading.days, 'dia', 'dias')
                            : ''}
                        {reading.pages !== null
                            ? ` · ${plural(reading.pages, 'página', 'páginas')}`
                            : ''}
                    </span>
                </>
            ) : (
                <span className="text-sm text-muted">—</span>
            )}
        </div>
    );
}

const card = 'flex flex-col gap-4 rounded-md border bg-surface p-5';

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

    return (
        <>
            <PageHeader
                title={t('Estatísticas')}
                actions={
                    <Field label={t('Período')} className="w-44">
                        <Select
                            value={selected}
                            onChange={(event) =>
                                router.get(
                                    statsIndex.url(),
                                    { year: event.target.value },
                                    { preserveScroll: true, replace: true },
                                )
                            }
                        >
                            {years.map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                            <option value="all">{t('Todo o histórico')}</option>
                        </Select>
                    </Field>
                }
            />

            <div className="flex flex-wrap gap-4">
                {kpis.map((kpi) => (
                    <div
                        key={kpi.label}
                        className="flex min-w-[180px] flex-1 flex-col gap-1.5 rounded-md border bg-surface p-4"
                    >
                        <span className="font-mono text-xs text-muted lowercase">
                            {kpi.label}
                        </span>
                        <span className="font-mono text-[30px] font-bold">
                            {kpi.value}
                        </span>
                        {kpi.note && (
                            <span className="text-xs text-muted">
                                {kpi.note}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {forecast && (
                <p className="text-sm text-muted">
                    {t('Previsão para o ano:')}{' '}
                    <span className="font-mono text-text">
                        {plural(forecast.projection, 'livro', 'livros')}
                    </span>{' '}
                    {t('no ritmo atual')}
                    {forecast.goal !== null && (
                        <>
                            {' '}
                            · {t('meta de')}{' '}
                            <span className="font-mono text-text">
                                {forecast.goal}
                            </span>
                        </>
                    )}
                    .
                </p>
            )}

            <div className="flex flex-wrap gap-4">
                <section className={`${card} min-w-0 flex-[3_1_360px]`}>
                    <SectionTitle>{t('livros por mês')}</SectionTitle>
                    <MonthlyChart bars={monthly} />
                </section>
                <section className={`${card} min-w-0 flex-[2_1_260px]`}>
                    <SectionTitle>{t('gêneros mais lidos')}</SectionTitle>
                    <Bars items={genres} translateLabels />
                </section>
            </div>

            <div className="flex flex-wrap gap-4">
                <section className={`${card} min-w-0 flex-[1_1_260px]`}>
                    <SectionTitle>{t('autores mais lidos')}</SectionTitle>
                    <Bars items={authors} />
                </section>
                <section className={`${card} min-w-0 flex-[1_1_260px]`}>
                    <SectionTitle>{t('destaques')}</SectionTitle>
                    <Highlight
                        label={t('mais rápido')}
                        reading={extremes.fastest}
                    />
                    <Highlight
                        label={t('mais longo')}
                        reading={extremes.longest}
                    />
                    <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs text-muted lowercase">
                            {t('melhor mês')}
                        </span>
                        <span className="text-sm">
                            {best_month
                                ? `${best_month.label}: ${plural(best_month.count, 'livro', 'livros')}`
                                : '—'}
                        </span>
                    </div>
                </section>
            </div>

            <section className={card}>
                <SectionTitle>{t('dias em que você leu')}</SectionTitle>
                <HeatMap days={calendar} showLegend />
                <p className="text-sm text-muted">
                    {t('Maior sequência:')}{' '}
                    <span className="font-mono text-text">
                        {plural(streak.longest, 'dia', 'dias')}
                    </span>{' '}
                    · {t('Sequência atual:')}{' '}
                    <span className="font-mono text-text">
                        {streak.current}
                    </span>
                </p>
            </section>
        </>
    );
}
