import type { ReadingProgress } from '@/types';

/** Barra fina de progresso (identidade: trilha elevada, preenchimento azul). */
export function ProgressBar({
    percent,
    className,
}: {
    percent: number | null;
    className?: string;
}) {
    return (
        <div
            className={`h-2 overflow-hidden rounded-sm bg-elevated ${className ?? ''}`}
        >
            <div
                className="h-full rounded-sm bg-primary"
                style={{ width: `${percent ?? 0}%` }}
            />
        </div>
    );
}

/** "pág. 40 de 300 · 13% · faltam 8 dias no seu ritmo". */
export function progressText(progress: ReadingProgress): string {
    const parts: string[] = [
        progress.pages === null
            ? `pág. ${progress.current_page}`
            : `pág. ${progress.current_page} de ${progress.pages}`,
    ];

    if (progress.percent !== null) {
        parts.push(`${progress.percent}%`);
    }

    if (progress.days_left !== null) {
        parts.push(
            `faltam ${progress.days_left} ${progress.days_left === 1 ? 'dia' : 'dias'} no seu ritmo`,
        );
    } else if (progress.pace === null && progress.pages !== null) {
        parts.push('sem sessões para estimar o ritmo');
    }

    return parts.join(' · ');
}
