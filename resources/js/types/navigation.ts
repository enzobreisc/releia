import type { ComponentType } from 'react';
import type { IconProps } from '@/components/icons';

export type NavItem = {
    title: string;
    href: string;
    icon: ComponentType<IconProps>;
};
