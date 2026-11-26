import { router, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { DemoTopBar } from './top-bar';
import { isWideShell, WIDE_SHELL_QUERY } from './wide-shell';

function DemoFrame({ children }: { children: ReactNode }) {
    return (
        <div className="demo-frame">
            <DemoTopBar />
            <div className="demo-frame-body">{children}</div>
        </div>
    );
}

/** The app layout is sized to the viewport, so it fills the frame body instead of adding a second scroll. */
export function SidebarDemoFrame({ children }: { children: ReactNode }) {
    return (
        <DemoFrame>
            <AppLayout>{children}</AppLayout>
        </DemoFrame>
    );
}

export function SidebarlessDemoFrame({ children }: { children: ReactNode }) {
    return <DemoFrame>{children}</DemoFrame>;
}

/** The page's native flag was fixed when it was fetched, so a resize across the breakpoint fetches it again. */
function useWideShellSync(): void {
    const isNative = usePage().props.native === true;

    useEffect(() => {
        const query = window.matchMedia(WIDE_SHELL_QUERY);

        function refetchWhenShellChanged() {
            if (isNative !== isWideShell()) {
                router.reload({ only: ['native'] });
            }
        }

        query.addEventListener('change', refetchWhenShellChanged);

        return () =>
            query.removeEventListener('change', refetchWhenShellChanged);
    }, [isNative]);
}

/** On desktop the quick-log page sits in a 360×600 menu bar window under the demo bar; on phones it fills the screen. */
export function QuickLogDemoFrame({ children }: { children: ReactNode }) {
    useWideShellSync();

    return (
        <DemoFrame>
            <div className="demo-quick-log-stage">
                <div className="demo-quick-log-window">{children}</div>
            </div>
        </DemoFrame>
    );
}
