import { RequestExamples } from '@/components/suggestions/request-examples';
import { SuggestionRequestForm } from '@/components/suggestions/request-form';
import type { SuggestionRequestFlow } from '@/hooks/use-suggestion-request';
import { DemoNotice } from './demo-notice';
import { useShellCopy } from './use-shell-copy';

const noop = () => undefined;

/** Stands in for resources/js/components/suggestions/suggestion-request-panel.tsx in the demo build: the demo has no model to read a request. */
export function SuggestionRequestPanel(_props: {
    flow: SuggestionRequestFlow;
    model: string;
}) {
    const { title, body } = useShellCopy().suggestionRequestNotice;

    return (
        <div className="flex flex-col gap-4">
            <SuggestionRequestForm
                text=""
                fieldRef={null}
                isFieldDisabled
                isSubmitDisabled
                onTextChange={noop}
                onSubmit={noop}
            />
            <RequestExamples isDisabled onPick={noop} />
            <DemoNotice title={title} body={body} />
        </div>
    );
}
