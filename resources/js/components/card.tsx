import { cn } from '@/lib/utils';

/** The Night card: dark surface with a hairline ring instead of a border. */
export function cardClass(className?: string) {
    return cn('rounded-md bg-surface inset-ring inset-ring-border', className);
}
