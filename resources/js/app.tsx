import { createInertiaApp } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

const appName = import.meta.env.VITE_APP_NAME || 'releia';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    // A janela da barra de menu (quick-log) fica sem a barra lateral.
    layout: (name) => (name === 'quick-log' ? null : AppLayout),
    progress: {
        color: '#2F6FE4',
    },
});
