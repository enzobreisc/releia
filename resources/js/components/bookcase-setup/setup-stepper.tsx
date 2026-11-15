import { Fragment } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export function SetupStepper({
    labels,
    current,
}: {
    labels: string[];
    /** One-based number of the active step. */
    current: number;
}) {
    const { t } = useTranslation();

    return (
        <ol aria-label={t('Etapas')} className="flex items-start">
            {labels.map((label, index) => {
                const number = index + 1;
                const isDone = number < current;
                const isCurrent = number === current;

                return (
                    <Fragment key={label}>
                        {index > 0 && (
                            <li
                                aria-hidden
                                className={cn(
                                    'mt-4.5 h-px w-14 sm:w-20',
                                    number <= current
                                        ? 'bg-primary'
                                        : 'bg-strong',
                                )}
                            />
                        )}
                        <li
                            aria-current={isCurrent ? 'step' : undefined}
                            className="flex w-24 flex-col items-center gap-2"
                        >
                            <span
                                className={cn(
                                    'flex size-9 items-center justify-center rounded-full font-mono text-xs',
                                    isCurrent && 'bg-text font-bold text-bg',
                                    isDone && 'bg-primary text-sm text-text',
                                    !isCurrent &&
                                        !isDone &&
                                        'bg-surface text-muted inset-ring inset-ring-strong',
                                )}
                            >
                                {isDone ? '✓' : number}
                            </span>
                            <span
                                className={cn(
                                    'text-xs font-bold',
                                    isCurrent ? 'text-text' : 'text-muted',
                                )}
                            >
                                {label}
                            </span>
                        </li>
                    </Fragment>
                );
            })}
        </ol>
    );
}
