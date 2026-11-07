import { createInertiaApp, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

const SIDEBARLESS_PAGES = ['quick-log', 'live-session'];

const appName = import.meta.env.VITE_APP_NAME || 'releia';

router.on('navigate', (event) => {
    document.documentElement.lang = event.detail.page.props.language_tag;
});

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    // The menu bar window (quick-log) and the live session screen have no sidebar.
    layout: (name) => (SIDEBARLESS_PAGES.includes(name) ? null : AppLayout),
    progress: {
        color: '#2F6FE4',
    },
});
