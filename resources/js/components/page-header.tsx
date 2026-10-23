import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';

type PageHeaderProps = {
    title: string;
    /** Window title. Defaults to the title itself. */
    headTitle?: string;
    description?: string;
    actions?: ReactNode;
};

export function PageHeader({
    title,
    headTitle,
    description,
    actions,
}: PageHeaderProps) {
    return (
        <>
            <Head title={headTitle ?? title} />
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                    <h1 className="text-[44px] leading-none font-extrabold tracking-tighter">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-[15px] font-medium text-muted">
                            {description}
                        </p>
                    )}
                </div>
                {actions}
            </div>
        </>
    );
}

/** Small uppercase label that opens a section ("LENDO AGORA"). */
export function SectionTitle({ children }: { children: string }) {
    return (
        <h2 className="text-xs font-extrabold tracking-widest text-muted uppercase">
            {children}
        </h2>
    );
}

/** Oversized title for pages about one thing (a book, an author). */
export function DisplayTitle({ children }: { children: ReactNode }) {
    return (
        <h1 className="text-[clamp(48px,6vw,76px)] leading-[0.92] font-extrabold tracking-[-0.045em]">
            {children}
        </h1>
    );
}
