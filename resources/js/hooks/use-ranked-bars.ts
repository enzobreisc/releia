import { useTranslation } from '@/hooks/use-translation';
import type { NamedCount } from '@/types';

export type RankedBarRow = {
    key: string;
    label: string;
    title: string;
    count: number;
    widthPercent: number;
};

export function useRankedBars(
    items: NamedCount[],
    translateLabels: boolean,
): RankedBarRow[] {
    const { plural, translateText } = useTranslation();

    if (items.length === 0) {
        return [];
    }

    const max = Math.max(...items.map((item) => item.count));

    return items.map((item) => {
        const label = translateLabels ? translateText(item.label) : item.label;

        return {
            key: item.label,
            label,
            title: `${label}: ${plural(item.count, 'livro', 'livros')}`,
            count: item.count,
            widthPercent: (item.count / max) * 100,
        };
    });
}
