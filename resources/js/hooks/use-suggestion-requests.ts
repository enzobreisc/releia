import { useState } from 'react';

export type RequestOptions = {
    preserveScroll: boolean;
    onStart: () => void;
    onFinish: () => void;
};

export function useSuggestionRequests(): {
    isBusy: boolean;
    options: RequestOptions;
} {
    const [isBusy, setIsBusy] = useState(false);

    return {
        isBusy,
        options: {
            preserveScroll: true,
            onStart: () => setIsBusy(true),
            onFinish: () => setIsBusy(false),
        },
    };
}
