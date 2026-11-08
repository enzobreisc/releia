import { STATUS_DOT } from '@/components/book/constants';
import { PillGroup, PillOption } from '@/components/book/pill-group';
import { STATUS_LABELS } from '@/components/status';
import type { Status } from '@/components/status';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

const STATUS_ORDER: Status[] = ['want_to_read', 'reading', 'read', 'abandoned'];

export function StatusPills({
    status,
    number,
    onPick,
}: {
    status: Status;
    number: number;
    onPick: (next: Status) => void;
}) {
    const { t } = useTranslation();

    return (
        <PillGroup role="radiogroup" label={t('Mover para')}>
            {STATUS_ORDER.filter(
                (value) => !(status === 'read' && value === 'abandoned'),
            ).map((value) => (
                <PillOption
                    key={value}
                    role="radio"
                    selected={value === status}
                    onClick={() => onPick(value)}
                >
                    <span
                        className={cn(
                            'size-1.5 rounded-full',
                            value === status ? STATUS_DOT[value] : 'bg-strong',
                        )}
                    />
                    {value === 'want_to_read' && number > 1
                        ? t('Quero reler')
                        : t(STATUS_LABELS[value])}
                </PillOption>
            ))}
        </PillGroup>
    );
}
