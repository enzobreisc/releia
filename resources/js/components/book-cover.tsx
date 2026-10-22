import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

/** The book cover, or a dark block with the title when there is no image. */
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

    return (
        <div
            className={cn(
                'relative aspect-[2/3] shrink-0 overflow-hidden rounded-cover bg-elevated shadow-cover',
                className,
            )}
        >
            {src ? (
                <img
                    src={src}
                    alt={t('Capa de :title', { title })}
                    loading="lazy"
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
