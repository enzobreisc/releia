import type { ResolvedComponent } from '@inertiajs/react';
import { ONLY_IN_APP_PAGE, WELCOME_PAGE } from './constants';
import { OnlyInAppPage } from './only-in-app-page';
import { WelcomePage } from './welcome-page';

/** Pages that exist only in the demo, so they have no file under resources/js/pages. */
export const DEMO_PAGES: Record<string, ResolvedComponent> = {
    [WELCOME_PAGE]: WelcomePage,
    [ONLY_IN_APP_PAGE]: OnlyInAppPage,
};
