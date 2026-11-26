import type { GoogleBooksKeyStatus } from '@/components/profile/types';
import { DemoNotice } from './demo-notice';
import { useShellCopy } from './use-shell-copy';

/** Stands in for resources/js/components/profile/google-books-key-form.tsx in the demo build: the demo keeps no keys. */
export function GoogleBooksKeyForm(_props: { status: GoogleBooksKeyStatus }) {
    const { title, body } = useShellCopy().bookKeyNotice;

    return <DemoNotice title={title} body={body} />;
}
