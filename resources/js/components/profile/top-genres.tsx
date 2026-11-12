import { useTranslation } from '@/hooks/use-translation';
import type { GenreCount } from './types';

export function TopGenres({ genres }: { genres: GenreCount[] }) {
    const { t, translateText } = useTranslation();

    return (
        <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-muted">
                {t('gêneros mais lidos')}
            </span>
            <div className="flex flex-wrap gap-1.5">
                {genres.map((genre) => (
                    <span
                        key={genre.label}
                        title={`${translateText(genre.label)}: ${genre.count}`}
                        className="inline-flex h-7 max-w-full items-center rounded-full bg-active px-3 text-xs font-bold text-link"
                    >
                        <span className="truncate">
                            {translateText(genre.label)}
                        </span>
                    </span>
                ))}
            </div>
        </div>
    );
}
