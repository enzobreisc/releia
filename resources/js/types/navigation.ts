import type { ComponentType } from 'react';
import type { IconProps } from '@/components/icons';
import type { TranslationKey } from '@/lib/i18n';

export type NavItem = {
    title: TranslationKey;
    href: string;
    icon: ComponentType<IconProps>;
    /** Key of the counter in `counts` (shared data). */
    count?: 'books' | 'notes' | 'queue' | 'shopping';
};

/** A titled block of the sidebar; the first one has no title. */
export type NavGroup = {
    title?: TranslationKey;
    items: NavItem[];
};
