import { afterAll, describe, expect, it } from 'vite-plus/test';
import {
    elapsedSeconds,
    pauseTimer,
    resumeTimer,
    startTimer,
} from '../src/domain/reading-timer';
import { getState } from '../src/state/store';
import type { DemoState, LiveTimerState } from '../src/state/types';
import { resetDemoState, restoreClock } from './harness';

const START = new Date('2026-11-26T12:00:00-03:00');
const TODAY = '2026-11-26';
const BOOK_ID = 10;
const START_PAGE = 146;
const MILLISECONDS_PER_SECOND = 1000;

function at(seconds: number): Date {
    return new Date(START.getTime() + seconds * MILLISECONDS_PER_SECOND);
}

function runningTimer(state: DemoState): LiveTimerState {
    const timer = state.runtime.liveTimer;

    if (timer === null) {
        throw new Error('The timer was not started.');
    }

    return timer;
}

afterAll(() => {
    restoreClock();
});

describe('reading timer', () => {
    it('stops counting while paused and counts again from the resume', () => {
        resetDemoState({ locale: 'en' });

        const state = getState();
        startTimer(
            state,
            { bookId: BOOK_ID, startPage: START_PAGE },
            {
                now: START,
                today: TODAY,
            },
        );
        const timer = runningTimer(state);

        pauseTimer(state, at(60));

        expect(elapsedSeconds(timer, at(300))).toBe(60);

        resumeTimer(state, at(300));

        expect(elapsedSeconds(timer, at(360))).toBe(120);
    });
});
