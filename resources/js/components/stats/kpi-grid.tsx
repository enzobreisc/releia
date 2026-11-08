import { cardClass } from '@/components/card';
import { useStatsKpis } from '@/hooks/use-stats-kpis';
import type { Indicators } from '@/types';

export function KpiGrid({ indicators }: { indicators: Indicators }) {
    const kpis = useStatsKpis(indicators);

    return (
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
    );
}
