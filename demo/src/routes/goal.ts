import { writeSetting } from '../domain/settings';
import { yearOf } from '../support/day';
import { optionalInteger, requiredText } from '../support/form-input';
import { FormErrors } from '../support/form-errors';
import {
    route,
    redirectBack,
    type RouteContext,
    type RouteResult,
} from '../server/router';
import { formRefusable, successNotice, translateFor } from './flash';

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

/** UpdateGoalRequest: the yearly goal is required; the daily one is optional and checked when given. */
function validGoals(ctx: RouteContext): {
    yearly: number;
    daily: number | null;
} {
    const { state, body } = ctx;
    const errors = new FormErrors(state.runtime.locale);
    const yearly = optionalInteger(body.yearly_goal);
    const daily = optionalInteger(body.daily_goal);

    if (requiredText(body.yearly_goal) === '') {
        errors.add('yearly_goal', 'O campo meta é obrigatório.');
    } else if (!inRange(yearly, MIN_YEARLY_GOAL, MAX_YEARLY_GOAL)) {
        errors.add('yearly_goal', 'A meta vai de 1 a 999 livros.');
    }

    if (daily !== null && !inRange(daily, MIN_DAILY_GOAL, MAX_DAILY_GOAL)) {
        errors.add('daily_goal', 'A meta diária vai de 1 a 2000 páginas.');
    }

    errors.throwIfAny();

    return { yearly: yearly ?? 0, daily };
}

function updateAction(ctx: RouteContext): RouteResult {
    const { state, today } = ctx;
    const { yearly, daily } = validGoals(ctx);

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

route('PUT', '/goal', (ctx) => formRefusable(() => updateAction(ctx)));
