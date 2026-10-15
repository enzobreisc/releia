import { Head } from '@inertiajs/react';

export default function Inicio() {
    return (
        <>
            <Head title="Início" />
            <div className="flex min-h-screen flex-col">
                <div className="h-10 shrink-0 app-drag" />
                <main className="flex flex-1 flex-col items-center justify-center gap-3">
                    <h1 className="font-mono text-3xl font-bold">releia</h1>
                    <p className="font-mono text-sm text-muted">
                        ## fase 0 · fundação
                    </p>
                </main>
            </div>
        </>
    );
}
