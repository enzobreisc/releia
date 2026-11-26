import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { CommandPalette } from '@/components/command-palette';
import { MobileTabBar } from '@/components/mobile-tab-bar';
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
        <div className="flex h-screen overflow-hidden max-md:h-auto max-md:min-h-screen max-md:flex-col max-md:overflow-visible">
            <AppSidebar collapsed={collapsed} onToggle={toggleSidebar} />
            <div className="flex min-w-0 flex-1 flex-col overflow-y-auto max-md:overflow-visible">
                <div className="sticky top-0 z-10 h-9 shrink-0 bg-bg app-drag max-md:hidden" />
                <main className="flex flex-1 flex-col gap-7 px-10 pt-2 pb-8 max-md:px-4.5 max-md:pt-5.5 max-md:pb-28">
                    {children}
                </main>
            </div>
            <MobileTabBar />
            {commandOpen && (
                <CommandPalette onClose={() => setCommandOpen(false)} />
            )}
            <Toaster />
        </div>
    );
}
