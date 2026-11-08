import { useRankedBars } from '@/hooks/use-ranked-bars';
import { useTranslation } from '@/hooks/use-translation';
import type { NamedCount } from '@/types';

const COUNT_COLUMN_WIDTH = '28px';

export function RankedBars({
    items,
    translateLabels = false,
    labelWidth,
}: {
    items: NamedCount[];
    translateLabels?: boolean;
    labelWidth: string;
}) {
    const { t } = useTranslation();
    const rows = useRankedBars(items, translateLabels);

    if (rows.length === 0) {
        return (
            <p className="text-sm text-muted">
                {t('Nada concluído neste período.')}
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-3.5">
            {rows.map((row) => (
                <div
                    key={row.key}
                    title={row.title}
                    className="grid items-center gap-3"
                    style={{
                        gridTemplateColumns: `${labelWidth} 1fr ${COUNT_COLUMN_WIDTH}`,
                    }}
                >
                    <span className="truncate text-[13px] font-bold">
                        {row.label}
                    </span>
                    <span className="h-2.5 rounded-r-[4px] bg-active">
                        <span
                            className="block h-2.5 rounded-r-[4px] bg-accent"
                            style={{ width: `${row.widthPercent}%` }}
                        />
                    </span>
                    <span className="text-right font-mono text-xs text-secondary">
                        {row.count}
                    </span>
                </div>
            ))}
        </div>
    );
}
