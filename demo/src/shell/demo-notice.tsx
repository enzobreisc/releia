import { Link } from '@inertiajs/react';
import { toBrowserUrl } from '../server/base-path';
import { ONLY_IN_APP_PATH } from './constants';
import { useShellCopy } from './use-shell-copy';

export function DemoNotice({ title, body }: { title: string; body: string }) {
    const { howItWorks } = useShellCopy().notice;

    return (
        <section className="flex flex-wrap items-center gap-3.5 rounded-md border border-dashed border-strong bg-surface px-4.5 py-4">
            <div className="flex min-w-60 flex-1 flex-col gap-1">
                <p className="text-sm font-extrabold">{title}</p>
                <p className="text-[13px] leading-normal font-medium text-secondary">
                    {body}
                </p>
            </div>
            <Link
                href={toBrowserUrl(ONLY_IN_APP_PATH)}
                className="text-[13px] font-bold text-link hover:underline"
            >
                {howItWorks}
            </Link>
        </section>
    );
}
