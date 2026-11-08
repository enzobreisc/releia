import { SectionTitle } from '@/components/page-header';
import type { NamedCount } from '@/types';
import { RankedBars } from '@/components/stats/ranked-bars';
import { StatsCard } from '@/components/stats/stats-card';

export function RankingCard({
    title,
    items,
    labelWidth,
    translateLabels = false,
}: {
    title: string;
    items: NamedCount[];
    labelWidth: string;
    translateLabels?: boolean;
}) {
    return (
        <StatsCard className="min-w-0 flex-[1_1_300px]">
            <SectionTitle>{title}</SectionTitle>
            <RankedBars
                items={items}
                translateLabels={translateLabels}
                labelWidth={labelWidth}
            />
        </StatsCard>
    );
}
