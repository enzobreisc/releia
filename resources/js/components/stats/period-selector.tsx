import { Segmented } from '@/components/form';
import { useStatsPeriod } from '@/hooks/use-stats-period';

export function PeriodSelector({
    years,
    selected,
}: {
    years: number[];
    selected: string;
}) {
    const { options, changePeriod } = useStatsPeriod(years);

    return (
        <Segmented options={options} value={selected} onChange={changePeriod} />
    );
}
