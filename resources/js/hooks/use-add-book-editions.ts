import { router } from '@inertiajs/react';
import { useState } from 'react';

export function useAddBookEditions(initialWorkKey: string | null) {
    const [openWork, setOpenWork] = useState<string | null>(initialWorkKey);

    function openEditions(workKey: string) {
        setOpenWork(workKey);
        router.reload({
            only: ['editions'],
            data: { work: workKey },
            replace: true,
        });
    }

    function toggleEditions(workKey: string) {
        if (openWork === workKey) {
            setOpenWork(null);
        } else {
            openEditions(workKey);
        }
    }

    function closeEditions() {
        setOpenWork(null);
    }

    return { openWork, openEditions, toggleEditions, closeEditions };
}
