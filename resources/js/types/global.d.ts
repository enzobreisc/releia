import type { SidebarReading } from './reading';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            native: boolean;
            counts: { books: number; notes: number; queue: number };
            reading_now: SidebarReading | null;
            [key: string]: unknown;
        };
    }
}

export {};
