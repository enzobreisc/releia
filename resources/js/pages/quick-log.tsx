import { Head, usePage } from '@inertiajs/react';
import { BookPicker } from '@/components/quick-log/book-picker';
import { QuickLogHeader } from '@/components/quick-log/quick-log-header';
import { QuickLogPhase } from '@/components/quick-log/quick-log-phase';
import type { QuickLogProps } from '@/components/quick-log/types';
import { WeekCard } from '@/components/quick-log/week-card';
import { Toaster } from '@/components/toaster';
import { useQuickLogSession } from '@/hooks/use-quick-log-session';
import { useTranslation } from '@/hooks/use-translation';

/**
 * Menu bar window (380×680): the day's reading. It does not use the layout with
 * a sidebar: app.tsx skips the layout for this page.
 */
export default function QuickLog({
    readings,
    available,
    timer,
    week,
    streak,
    shortcut,
    saved,
}: QuickLogProps) {
    const { t } = useTranslation();
    const { native } = usePage().props;
    const session = useQuickLogSession({ readings, timer, saved });

    return (
        <div
            data-mobile={native ? undefined : ''}
            className="flex h-dvh flex-col gap-4.5 overflow-hidden bg-bg px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] text-text select-none data-mobile:gap-6"
        >
            <Head title={t('Leitura do dia')} />

            <QuickLogHeader native={native} shortcut={shortcut} />

            <WeekCard week={week} streak={streak} />

            {session.selected && !session.done && (
                <BookPicker
                    readings={readings}
                    available={available}
                    selected={session.selected}
                    locked={timer !== null}
                    onSelect={session.selectBook}
                />
            )}

            <QuickLogPhase
                available={available}
                timer={timer}
                selected={session.selected}
                done={session.done}
                finishing={session.finishing}
                onStartFinishing={session.startFinishing}
                onCancelFinishing={session.cancelFinishing}
                onCloseSummary={session.closeSummary}
            />

            <Toaster variant="bar" />
        </div>
    );
}
