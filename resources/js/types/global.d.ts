import type { SidebarReading } from './reading';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            counts: { books: number };
            reading_now: SidebarReading | null;
            [key: string]: unknown;
        };
    }
}

export {};
