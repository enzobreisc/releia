import type { Locale } from '@/lib/i18n';
import type { SidebarReading } from './reading';
import type { Toast } from './toast';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            locale: Locale;
            language_tag: string;
            native: boolean;
            counts: {
                books: number;
                queue: number;
                shopping: number;
            };
            reading_now: SidebarReading | null;
            toast: Toast | null;
            [key: string]: unknown;
        };
    }
}

export {};
