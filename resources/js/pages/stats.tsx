import { router } from '@inertiajs/react';
import { HeatMap } from '@/components/heat-map';
import { Field, Select } from '@/components/form';
import { PageHeader, SectionTitle } from '@/components/page-header';
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

const formatNumber = (value: number | null, digits = 0) =>
    value === null
        ? '—'
        : value.toLocaleString('pt-BR', {
              maximumFractionDigits: digits,
          });

/** Barras horizontais com proporção sobre o maior valor. */
function Bars({ items }: { items: NamedCount[] }) {
    if (items.length === 0) {
        return (
            <p className="text-sm text-muted">Nada concluído neste período.</p>
        );
    }

    const max = Math.max(...items.map((item) => item.count));

    return (
        <div className="flex flex-col gap-3">
            {items.map((item) => (
                <div key={item.label} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                        <span className="truncate">{item.label}</span>
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

/** Colunas de livros concluídos por mês (ou por ano no histórico). */
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
    return (
        <div className="flex flex-col gap-1">
            <span className="font-mono text-xs text-muted lowercase">
                {label}
            </span>
            {reading ? (
                <>
                    <span className="font-semibold">{reading.title}</span>
                    <span className="text-sm text-muted">
                        {reading.days !== null ? `${reading.days} dias` : ''}
                        {reading.pages !== null
                            ? ` · ${reading.pages} páginas`
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
    const kpis = [
        {
            label: 'livros lidos',
            value: formatNumber(indicators.books_read),
            note:
                indicators.rereads > 0
                    ? `inclui ${indicators.rereads} ${indicators.rereads === 1 ? 'releitura' : 'releituras'}`
                    : undefined,
        },
        { label: 'páginas lidas', value: formatNumber(indicators.pages_read) },
        {
            label: 'páginas por dia',
            value: formatNumber(indicators.pages_per_day, 1),
            note: `${formatNumber(indicators.pages_per_reading_day, 1)} nos dias com leitura`,
        },
        {
            label: 'dias por livro',
            value: formatNumber(indicators.days_per_book, 1),
        },
    ];

    return (
        <>
            <PageHeader
                title="Estatísticas"
                actions={
                    <Field label="Período" className="w-44">
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
                            <option value="all">Todo o histórico</option>
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
                    Previsão para o ano:{' '}
                    <span className="font-mono text-text">
                        {forecast.projection}
                    </span>{' '}
                    {forecast.projection === 1 ? 'livro' : 'livros'} no ritmo
                    atual
                    {forecast.goal !== null && (
                        <>
                            {' '}
                            · meta de{' '}
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
                    <SectionTitle>livros por mês</SectionTitle>
                    <MonthlyChart bars={monthly} />
                </section>
                <section className={`${card} min-w-0 flex-[2_1_260px]`}>
                    <SectionTitle>gêneros mais lidos</SectionTitle>
                    <Bars items={genres} />
                </section>
            </div>

            <div className="flex flex-wrap gap-4">
                <section className={`${card} min-w-0 flex-[1_1_260px]`}>
                    <SectionTitle>autores mais lidos</SectionTitle>
                    <Bars items={authors} />
                </section>
                <section className={`${card} min-w-0 flex-[1_1_260px]`}>
                    <SectionTitle>destaques</SectionTitle>
                    <Highlight label="mais rápido" reading={extremes.fastest} />
                    <Highlight label="mais longo" reading={extremes.longest} />
                    <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs text-muted lowercase">
                            melhor mês
                        </span>
                        <span className="text-sm">
                            {best_month
                                ? `${best_month.label}: ${best_month.count} ${best_month.count === 1 ? 'livro' : 'livros'}`
                                : '—'}
                        </span>
                    </div>
                </section>
            </div>

            <section className={card}>
                <SectionTitle>dias em que você leu</SectionTitle>
                <HeatMap days={calendar} showLegend />
                <p className="text-sm text-muted">
                    Maior sequência:{' '}
                    <span className="font-mono text-text">
                        {streak.longest}
                    </span>{' '}
                    {streak.longest === 1 ? 'dia' : 'dias'} · Sequência atual:{' '}
                    <span className="font-mono text-text">
                        {streak.current}
                    </span>
                </p>
            </section>
        </>
    );
}
