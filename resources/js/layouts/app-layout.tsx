import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { CommandPalette } from '@/components/command-palette';
import { Toaster } from '@/components/toaster';
import { useStored } from '@/hooks/use-stored';

const COLLAPSED_KEY = 'releia.sidebar.collapsed';

export default function AppLayout({ children }: { children: ReactNode }) {
    const [sidebarState, setSidebarState] = useStored<'collapsed' | 'expanded'>(
        COLLAPSED_KEY,
        'expanded',
    );
    const collapsed = sidebarState === 'collapsed';
    const [commandOpen, setCommandOpen] = useState(false);

    const toggleSidebar = useCallback(
        () => setSidebarState(collapsed ? 'expanded' : 'collapsed'),
        [collapsed, setSidebarState],
    );

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (!event.metaKey || event.altKey || event.ctrlKey) {
                return;
            }

            const key = event.key.toLowerCase();

            if (key === 'b') {
                event.preventDefault();
                toggleSidebar();
            } else if (key === 'p') {
                event.preventDefault();
                setCommandOpen((value) => !value);
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [toggleSidebar]);

    return (
        <div className="flex h-screen overflow-hidden">
            <AppSidebar collapsed={collapsed} onToggle={toggleSidebar} />
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
