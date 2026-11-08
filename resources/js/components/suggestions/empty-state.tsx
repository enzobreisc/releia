import type { ReactNode } from 'react';
import { cardClass } from '@/components/card';

export function EmptyState({ children }: { children: ReactNode }) {
    return <p className={cardClass('p-5 text-sm text-muted')}>{children}</p>;
}
