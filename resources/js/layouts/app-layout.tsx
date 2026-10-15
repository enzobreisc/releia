import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { CommandPalette } from '@/components/command-palette';
import { Toaster } from '@/components/toaster';

const COLLAPSED_KEY = 'releia.sidebar.collapsed';

function readCollapsed(): boolean {
    try {
        return localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
        return false;
    }
}

export default function AppLayout({ children }: { children: ReactNode }) {
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const [commandOpen, setCommandOpen] = useState(false);

    useEffect(() => {
        try {
            localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
        } catch {
            // Sem localStorage a barra só não lembra o estado.
        }
    }, [collapsed]);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (!event.metaKey || event.altKey || event.ctrlKey) {
                return;
            }

            const key = event.key.toLowerCase();

            if (key === 'b') {
                event.preventDefault();
                setCollapsed((value) => !value);
            } else if (key === 'p') {
                event.preventDefault();
                setCommandOpen((value) => !value);
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
        <div className="flex h-screen overflow-hidden">
            <AppSidebar
                collapsed={collapsed}
                onToggle={() => setCollapsed((value) => !value)}
                onOpenCommand={() => setCommandOpen(true)}
            />
            <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
                <div className="sticky top-0 z-10 h-9 shrink-0 bg-bg app-drag" />
                <main className="flex flex-1 flex-col gap-7 px-10 pt-2 pb-8">
                    {children}
                </main>
            </div>
            {commandOpen && (
                <CommandPalette onClose={() => setCommandOpen(false)} />
            )}
            <Toaster />
        </div>
    );
}
