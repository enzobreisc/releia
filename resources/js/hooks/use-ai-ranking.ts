import { router } from '@inertiajs/react';
import { useSuggestionRequests } from '@/hooks/use-suggestion-requests';
import { ai } from '@/routes/suggestions';

export function useAiRanking() {
    const { isBusy, options } = useSuggestionRequests();

    return {
        isBusy,
        setEnabled: (enabled: boolean) =>
            router.visit(ai(), { data: { enabled }, ...options }),
    };
}
