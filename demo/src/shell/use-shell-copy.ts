import { usePage } from '@inertiajs/react';
import { shellCopyFor } from './copy';

export function useShellCopy() {
    const { locale } = usePage().props;

    return shellCopyFor(locale);
}
