declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            counts: { books: number };
            [key: string]: unknown;
        };
    }
}

export {};
