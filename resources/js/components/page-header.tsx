import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';

type PageHeaderProps = {
    title: string;
    /** Título da janela. Padrão: o próprio título. */
    headTitle?: string;
    /** Trecho da trilha depois de "releia /". Padrão: título em minúsculas. */
    crumb?: string;
    description?: string;
    actions?: ReactNode;
};

export function PageHeader({
    title,
    headTitle,
    crumb,
    description,
    actions,
}: PageHeaderProps) {
    return (
        <>
            <Head title={headTitle ?? title} />
            <div className="font-mono text-[13px] text-muted">
                releia <span className="text-faint">/</span>{' '}
                {crumb ?? title.toLowerCase()}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="font-mono text-[32px] leading-tight font-bold">
                        {title}
                    </h1>
                    {description && (
                        <p className="mt-1.5 text-[15px] text-muted">
                            {description}
                        </p>
                    )}
                </div>
                {actions}
            </div>
        </>
    );
}

/** Título de seção no estilo Markdown: "## lendo agora". */
export function SectionTitle({ children }: { children: string }) {
    return (
        <h2 className="font-mono text-xs text-muted lowercase">
            ## {children}
        </h2>
    );
}
