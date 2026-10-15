declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            counts: { books: number; notes: number; queue: number };
            [key: string]: unknown;
        };
    }
}

export {};
