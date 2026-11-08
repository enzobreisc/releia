import type { ReactNode } from 'react';
import { cardClass } from '@/components/card';
import { cn } from '@/lib/utils';

const SECTION_CLASS = 'flex flex-col gap-4 rounded-lg p-6';

export function StatsCard({
    className,
    children,
}: {
    className?: string;
    children: ReactNode;
}) {
    return (
        <section className={cardClass(cn(SECTION_CLASS, className))}>
            {children}
        </section>
    );
}
