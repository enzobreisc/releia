import { writeSetting } from '../domain/settings';
import { WriteRejected } from '../domain/reading-writes';
import { yearOf } from '../support/day';
import { optionalInteger } from '../support/form-input';
import {
    route,
    redirectBack,
    type RouteContext,
    type RouteResult,
} from '../server/router';
import { refusable, successNotice, translateFor } from './flash';

const MIN_YEARLY_GOAL = 1;
const MAX_YEARLY_GOAL = 999;
const MIN_DAILY_GOAL = 1;
const MAX_DAILY_GOAL = 2000;
const YEARLY_GOAL_KEY = 'yearly_goal';
const DAILY_GOAL_KEY = 'daily_goal';

function inRange(
    value: number | null,
    min: number,
    max: number,
): value is number {
    return value !== null && value >= min && value <= max;
}

function updateAction(ctx: RouteContext): RouteResult {
    const { state, today, body } = ctx;
    const yearly = optionalInteger(body.yearly_goal);
    const daily = optionalInteger(body.daily_goal);

    if (!inRange(yearly, MIN_YEARLY_GOAL, MAX_YEARLY_GOAL)) {
        throw new WriteRejected(
            translateFor(state, 'A meta vai de 1 a 999 livros.'),
        );
    }

    if (daily !== null && !inRange(daily, MIN_DAILY_GOAL, MAX_DAILY_GOAL)) {
        throw new WriteRejected(
            translateFor(state, 'A meta diária vai de 1 a 2000 páginas.'),
        );
    }

    writeSetting(state, YEARLY_GOAL_KEY, yearly, today);
    writeSetting(state, DAILY_GOAL_KEY, daily, today);

    return redirectBack({
        toast: successNotice(
            translateFor(state, 'Meta salva'),
            translateFor(state, ':count livros em :year', {
                count: yearly,
                year: yearOf(today),
            }),
        ),
    });
}

route('PUT', '/goal', (ctx) => refusable(() => updateAction(ctx)));
