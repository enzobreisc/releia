import { cn } from '@/lib/utils';

/** Capa do livro, ou um retângulo vazio com o título quando não há imagem. */
export function BookCover({
    src,
    title,
    className,
}: {
    src: string | null;
    title: string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'relative aspect-[2/3] shrink-0 overflow-hidden rounded-[4px] border bg-elevated',
                className,
            )}
        >
            {src ? (
                <img
                    src={src}
                    alt={`Capa de ${title}`}
                    loading="lazy"
                    className="size-full object-cover"
                />
            ) : (
                <span className="absolute inset-0 flex items-center p-2 text-center font-mono text-[10px] leading-tight text-faint">
                    {title}
                </span>
            )}
        </div>
    );
}
