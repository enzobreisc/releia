import { cn } from '@/lib/utils';

export function cardClass(className?: string) {
    return cn('rounded-md bg-surface inset-ring inset-ring-border', className);
}
