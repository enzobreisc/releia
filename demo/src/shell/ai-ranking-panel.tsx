import type { AiAvailability, AiRanking } from '@/types';
import { DemoNotice } from './demo-notice';
import { useShellCopy } from './use-shell-copy';

type AiRankingPanelProps = {
    ranking: AiRanking;
    availability?: AiAvailability | null;
    isBusy: boolean;
    onToggle: (enabled: boolean) => void;
};

/** Stands in for resources/js/components/suggestions/ai-ranking-panel.tsx in the demo build: there is no Ollama here. */
export function AiRankingPanel(_props: AiRankingPanelProps) {
    const { title, body } = useShellCopy().aiNotice;

    return <DemoNotice title={title} body={body} />;
}
