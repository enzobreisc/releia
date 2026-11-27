import type { SuggestionRequestFlow } from '@/hooks/use-suggestion-request';
import { RequestExamples } from './request-examples';
import { SuggestionRequestForm } from './request-form';
import { RequestStatus } from './request-status';
import { RequestTags } from './request-tags';

export function SuggestionRequestPanel({
    flow,
    model,
}: {
    flow: SuggestionRequestFlow;
    model: string;
}) {
    return (
        <div className="flex flex-col gap-4">
            <SuggestionRequestForm
                text={flow.text}
                fieldRef={flow.fieldRef}
                isFieldDisabled={flow.isFieldDisabled}
                isSubmitDisabled={flow.isSubmitDisabled}
                onTextChange={flow.setText}
                onSubmit={flow.actions.submitForm}
            />
            {flow.notice?.kind !== 'not-understood' && (
                <RequestExamples
                    isDisabled={flow.isFieldDisabled}
                    onPick={flow.actions.pickExample}
                />
            )}
            {flow.filters !== null && <RequestTags filters={flow.filters} />}
            <RequestStatus
                notice={flow.notice}
                model={model}
                isChecking={flow.isChecking}
                isFieldDisabled={flow.isFieldDisabled}
                actions={flow.actions}
            />
        </div>
    );
}
