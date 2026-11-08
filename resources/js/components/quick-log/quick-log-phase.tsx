import type { ReadingSummary } from '@/types';
import { DonePhase } from './done-phase';
import { EmptyPhase } from './empty-phase';
import { FinishedPhase } from './finished-phase';
import { FinishPhase } from './finish-phase';
import { IdlePhase } from './idle-phase';
import { RunningPhase } from './running-phase';
import type { AvailableBook, Saved, Timer } from './types';

export function QuickLogPhase({
    available,
    timer,
    selected,
    done,
    finishing,
    onStartFinishing,
    onCancelFinishing,
    onCloseSummary,
}: {
    available: AvailableBook[];
    timer: Timer | null;
    selected: ReadingSummary | null;
    done: Saved | null;
    finishing: boolean;
    onStartFinishing: () => void;
    onCancelFinishing: () => void;
    onCloseSummary: () => void;
}) {
    if (done) {
        return done.finished ? (
            <FinishedPhase saved={done} onClose={onCloseSummary} />
        ) : (
            <DonePhase saved={done} onClose={onCloseSummary} />
        );
    }

    if (selected === null) {
        return <EmptyPhase available={available} />;
    }

    if (timer && finishing) {
        return (
            <FinishPhase
                timer={timer}
                book={selected}
                onSaved={onCancelFinishing}
                onCancel={onCancelFinishing}
            />
        );
    }

    if (timer) {
        return <RunningPhase timer={timer} onStop={onStartFinishing} />;
    }

    return (
        <IdlePhase
            key={`${selected.book_id}-${selected.current_page}`}
            book={selected}
        />
    );
}
