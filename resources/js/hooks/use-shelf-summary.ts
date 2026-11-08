import { STATUS_LABELS } from '@/components/status';
import type { Status } from '@/components/status';
import { useTranslation } from '@/hooks/use-translation';
import type { SpineBook } from '@/types';

export function useShelfSummary(books: SpineBook[]): string {
    const { t } = useTranslation();

    return (Object.keys(STATUS_LABELS) as Status[])
        .map((status) => ({
            status,
            count: books.filter((book) => book.status === status).length,
        }))
        .filter(({ count }) => count > 0)
        .map(
            ({ status, count }) =>
                `${count} ${t(STATUS_LABELS[status]).toLowerCase()}`,
        )
        .join(', ');
}
