import { heatClass } from '@/components/heat-map';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import {
    BRIGHT_EVERY,
    HEAT_BRIGHT,
    HEAT_LIT,
    MINUTE_SQUARES,
    SECONDS_PER_MINUTE,
} from './constants';

function squareLevel(index: number, minutes: number) {
    if (index >= minutes) {
        return 0;
    }

    return index % BRIGHT_EVERY === BRIGHT_EVERY - 1 ? HEAT_BRIGHT : HEAT_LIT;
}

/** One square per minute read, up to a full grid. */
export function MinuteGrid({
    seconds,
    live,
}: {
    seconds: number;
    live: boolean;
}) {
    const { t } = useTranslation();
    const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);

    return (
        <div
            role="img"
            aria-label={t(':minutes minutos lidos', { minutes })}
            className="grid grid-cols-10 gap-1"
        >
            {Array.from({ length: MINUTE_SQUARES }, (_, index) => {
                const current = live && index === minutes;

                return (
                    <span
                        key={index}
                        className={cn(
                            'aspect-square rounded-[4px] transition-colors duration-700',
                            current
                                ? 'animate-pulse bg-accent'
                                : heatClass(squareLevel(index, minutes)),
                        )}
                    />
                );
            })}
        </div>
    );
}
