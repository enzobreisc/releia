import { useState } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export function BookCover({
    src,
    title,
    className,
}: {
    src: string | null;
    title: string;
    className?: string;
}) {
    const { t } = useTranslation();
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const imageSrc = src === failedSrc ? null : src;

    return (
        <div
            className={cn(
                'relative aspect-[2/3] shrink-0 overflow-hidden rounded-cover bg-elevated shadow-cover',
                className,
            )}
        >
            {imageSrc ? (
                <img
                    src={imageSrc}
                    alt={t('Capa de :title', { title })}
                    loading="lazy"
                    onError={() => setFailedSrc(imageSrc)}
                    className="size-full object-cover"
                />
            ) : (
                <span className="absolute inset-0 flex items-start p-3 text-left text-[13px] leading-tight font-extrabold text-secondary">
                    {title}
                </span>
            )}
        </div>
    );
}
