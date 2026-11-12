import { heatClass } from '@/components/heat-map';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export function ReaderAvatar({ avatar }: { avatar: number[] }) {
    const { t } = useTranslation();

    return (
        <div
            role="img"
            aria-label={t('Avatar: seus últimos 25 dias de leitura')}
            title={t('Seus últimos 25 dias de leitura')}
            className="grid size-50 grid-cols-5 grid-rows-5 gap-1.5 rounded-[32px] bg-surface p-3.5 shadow-float inset-ring inset-ring-strong"
        >
            {avatar.map((level, index) => (
                <span
                    key={index}
                    className={cn('rounded-cover', heatClass(level))}
                />
            ))}
        </div>
    );
}
