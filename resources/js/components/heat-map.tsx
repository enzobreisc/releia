import { cn } from '@/lib/utils';
import type { CalendarDay } from '@/types';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

// Classes escritas por extenso: o Tailwind só gera o que aparece assim no código.
const HEAT_CLASSES = [
    'bg-heat-0',
    'bg-heat-1',
    'bg-heat-2',
    'bg-heat-3',
    'bg-heat-4',
];

/** Classe de cor para um nível do mapa de calor (0 = sem leitura, 4 = mais). */
export function heatClass(level: number): string {
    return HEAT_CLASSES[level] ?? HEAT_CLASSES[0];
}

function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function dayTitle(day: CalendarDay) {
    return `${formatDate(day.date)} · ${day.pages} ${day.pages === 1 ? 'página' : 'páginas'}`;
}

/**
 * Mapa de calor de dias lidos.
 *
 * Padrão: estilo GitHub, uma coluna por semana e uma linha por dia da semana.
 * `compact`: uma linha só, sem rótulos e sem preenchimento (ex.: 7 dias na barra lateral).
 */
export function HeatMap({
    days,
    showLegend = false,
    compact = false,
    className,
}: {
    days: CalendarDay[];
    showLegend?: boolean;
    compact?: boolean;
    className?: string;
}) {
    if (compact) {
        return (
            <div
                role="img"
                aria-label="Mapa de calor de dias lidos"
                className={cn('flex gap-[3px]', className)}
            >
                {days.map((day) => (
                    <span
                        key={day.date}
                        title={dayTitle(day)}
                        className={cn(
                            'size-3 rounded-[2px]',
                            heatClass(day.level),
                        )}
                    />
                ))}
            </div>
        );
    }

    // Preenche o começo da primeira semana com células vazias para alinhar os dias.
    const firstWeekday =
        days.length > 0 ? new Date(`${days[0].date}T00:00:00`).getDay() : 0;
    const cells: (CalendarDay | null)[] = [
        ...Array.from({ length: firstWeekday }, () => null),
        ...days,
    ];

    return (
        <div className={cn('flex flex-col gap-3', className)}>
            <div className="flex gap-2">
                <div className="grid grid-rows-7 gap-[3px] pt-px font-mono text-[10px] text-faint">
                    {WEEKDAYS.map((weekday, index) => (
                        <span
                            key={weekday}
                            className={cn(
                                'flex h-3 items-center',
                                index % 2 === 1 ? '' : 'invisible',
                            )}
                        >
                            {weekday}
                        </span>
                    ))}
                </div>
                <div
                    role="img"
                    aria-label="Mapa de calor de dias lidos"
                    className="grid auto-cols-[12px] grid-flow-col grid-rows-7 gap-[3px] overflow-x-auto"
                >
                    {cells.map((day, index) =>
                        day === null ? (
                            <span key={`pad-${index}`} className="size-3" />
                        ) : (
                            <span
                                key={day.date}
                                title={dayTitle(day)}
                                className={cn(
                                    'size-3 rounded-[2px]',
                                    heatClass(day.level),
                                )}
                            />
                        ),
                    )}
                </div>
            </div>
            {showLegend && (
                <div className="flex items-center justify-end gap-1.5 font-mono text-xs text-muted">
                    <span>menos</span>
                    {[0, 1, 2, 3, 4].map((level) => (
                        <span
                            key={level}
                            className={cn(
                                'size-3 rounded-[2px]',
                                heatClass(level),
                            )}
                        />
                    ))}
                    <span>mais</span>
                </div>
            )}
        </div>
    );
}
