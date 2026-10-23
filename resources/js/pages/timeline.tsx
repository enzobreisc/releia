import { Segmented } from '@/components/form';
import { PageHeader } from '@/components/page-header';
import { TimelineCovers } from '@/components/timeline-covers';
import { TimelineLanes } from '@/components/timeline-lanes';
import { Legend } from '@/components/timeline-parts';
import { useStored } from '@/hooks/use-stored';
import { useTranslation } from '@/hooks/use-translation';
import { buildYearLanes, readingsEndingIn } from '@/lib/timeline';
import type { TimelineYear } from '@/types';

type TimelineView = 'lanes' | 'covers';

export default function Timeline({
    today,
    years,
}: {
    today: string;
    years: TimelineYear[];
}) {
    const { t, monthNames } = useTranslation();
    const [view, setView] = useStored<TimelineView>('timeline.view', 'lanes');
    const coverGroups = years
        .map(({ year }) => ({
            year,
            readings: readingsEndingIn(years, year, today),
        }))
        .filter(({ readings }) => readings.length > 0);

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title={t('Linha do tempo')}
                description={t('Os livros por onde você passou')}
                actions={
                    <Segmented
                        className="w-72"
                        value={view}
                        onChange={(next) => setView(next as TimelineView)}
                        options={[
                            { value: 'lanes', label: t('Faixas por mês') },
                            { value: 'covers', label: t('Capas') },
                        ]}
                    />
                }
            />
            <Legend />
            {view === 'lanes' ? (
                <TimelineLanes
                    lanes={buildYearLanes(years, today)}
                    today={today}
                    monthNames={monthNames}
                />
            ) : (
                <TimelineCovers groups={coverGroups} monthNames={monthNames} />
            )}
        </div>
    );
}
