import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export function GoalTallies({
    goal,
    finished,
}: {
    goal: number;
    finished: number;
}) {
    const { t } = useTranslation();

    return (
        <div
            role="img"
            aria-label={t(':finished de :goal livros lidos', {
                finished,
                goal,
            })}
            className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-[3px]"
        >
            {Array.from({ length: goal }, (_, index) => (
                <span
                    key={index}
                    className={cn(
                        'aspect-square rounded-[2px]',
                        index < finished ? 'bg-heat-3' : 'bg-heat-0',
                    )}
                />
            ))}
        </div>
    );
}
