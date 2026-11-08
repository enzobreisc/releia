import { router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/use-translation';
import { index as statsIndex } from '@/routes/stats';

const ALL_PERIOD = 'all';

export function useStatsPeriod(years: number[]) {
    const { t } = useTranslation();
    const options = [
        ...years.map((year) => ({ value: String(year), label: String(year) })),
        { value: ALL_PERIOD, label: t('Todo o histórico') },
    ];

    const changePeriod = (period: string) =>
        router.get(
            statsIndex.url(),
            { year: period },
            { preserveScroll: true, replace: true },
        );

    return { options, changePeriod };
}
