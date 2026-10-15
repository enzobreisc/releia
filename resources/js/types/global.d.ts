import type { SidebarReading } from './reading';
import type { Toast } from './toast';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            native: boolean;
            counts: { books: number; notes: number; queue: number };
            reading_now: SidebarReading | null;
            toast: Toast | null;
            [key: string]: unknown;
        };
    }
}

export {};
