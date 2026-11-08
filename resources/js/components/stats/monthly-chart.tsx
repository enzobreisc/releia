import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import type { MonthlyBar } from '@/types';

const MONTH_BAR_MAX_HEIGHT_PX = 140;
const EMPTY_MONTH_BAR_HEIGHT_PX = 2;

function barHeightPx(count: number, max: number) {
    return count > 0
        ? Math.round((count / max) * MONTH_BAR_MAX_HEIGHT_PX)
        : EMPTY_MONTH_BAR_HEIGHT_PX;
}

export function MonthlyChart({
    bars,
    max,
    ariaLabel,
}: {
    bars: MonthlyBar[];
    max: number;
    ariaLabel: string;
}) {
    const { plural } = useTranslation();
    const columns = {
        gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))`,
    };

    return (
        <div className="flex flex-col gap-2">
            <div
                role="img"
                aria-label={ariaLabel}
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
                                height: `${barHeightPx(bar.count, max)}px`,
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
