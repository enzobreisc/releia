import type { Locale } from '@/lib/i18n';
import type { SidebarReading, Toast } from '@/types';
import { readingsInProgress } from '../domain/dashboard';
import { languageTag as languageTagOf } from '../support/labels';
import { createReadModel } from '../domain/read-model';
import type { DemoState } from '../state/types';
import { sidebarReading } from './reading';

type DemoSharedProps = {
    name: string;
    locale: Locale;
    language_tag: string;
    native: boolean;
    counts: { books: number; queue: number; shopping: number };
    toast: Toast | null;
    reading_now: SidebarReading | null;
    has_live_session: boolean;
};

const APP_NAME = 'releia';
const NOT_IN_NATIVE_APP = false;

/** HandleInertiaRequests::share, for the state as it is at `today`. */
export function sharedProps(state: DemoState, today: string): DemoSharedProps {
    const model = createReadModel(state, today, new Date());
    const { tables, runtime } = state;
    const [reading] = readingsInProgress(model);

    return {
        name: APP_NAME,
        locale: runtime.locale,
        language_tag: languageTagOf(runtime.locale),
        native: NOT_IN_NATIVE_APP,
        counts: {
            books: tables.books.length,
            queue: tables.queue_items.length,
            shopping: tables.shopping_items.filter(
                (item) => item.bought_at === null,
            ).length,
        },
        toast: runtime.flashToast,
        reading_now:
            reading === undefined ? null : sidebarReading(model, reading),
        has_live_session: runtime.liveTimer !== null,
    };
}
