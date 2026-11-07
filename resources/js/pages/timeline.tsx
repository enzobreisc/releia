import { Segmented } from '@/components/form';
import { PageHeader } from '@/components/page-header';
import { TimelineCovers } from '@/components/timeline-covers';
import { TimelineAgenda } from '@/components/timeline-agenda';
import { TimelineGantt } from '@/components/timeline-gantt';
import { TimelineMonths } from '@/components/timeline-months';
import { Legend } from '@/components/timeline-parts';
import { useStored } from '@/hooks/use-stored';
import { useTranslation } from '@/hooks/use-translation';
import { readingsEndingIn } from '@/lib/timeline';
import type { TimelineYear } from '@/types';

type TimelineView = 'agenda' | 'year' | 'month' | 'covers';

const VIEWS: TimelineView[] = ['agenda', 'year', 'month', 'covers'];

export default function Timeline({
    today,
    years,
}: {
    today: string;
    years: TimelineYear[];
}) {
    const { t, monthNames } = useTranslation();
    const [view, setView] = useStored<TimelineView>('timeline.view', 'agenda');
    const activeView = VIEWS.includes(view) ? view : 'agenda';
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
                        className="w-md"
                        value={activeView}
                        onChange={(next) => setView(next as TimelineView)}
                        options={[
                            { value: 'agenda', label: t('Agenda') },
                            { value: 'year', label: t('Por ano') },
                            { value: 'month', label: t('Por mês') },
                            { value: 'covers', label: t('Capas') },
                        ]}
                    />
                }
            />
            <Legend />
            {activeView === 'agenda' && (
                <TimelineAgenda
                    groups={[...coverGroups].reverse()}
                    today={today}
                    monthNames={monthNames}
                />
            )}
            {activeView === 'year' && (
                <TimelineGantt
                    years={years}
                    today={today}
                    monthNames={monthNames}
                />
            )}
            {activeView === 'month' && (
                <TimelineMonths
                    years={years}
                    today={today}
                    monthNames={monthNames}
                />
            )}
            {activeView === 'covers' && <TimelineCovers groups={coverGroups} />}
        </div>
    );
}
