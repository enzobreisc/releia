import { createInertiaApp, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

const appName = import.meta.env.VITE_APP_NAME || 'releia';

router.on('navigate', (event) => {
    document.documentElement.lang = event.detail.page.props.language_tag;
});

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    // The menu bar window (quick-log) has no sidebar.
    layout: (name) => (name === 'quick-log' ? null : AppLayout),
    progress: {
        color: '#2F6FE4',
    },
});
