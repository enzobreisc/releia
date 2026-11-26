import { createReadModel } from '../domain/read-model';
import { timelineProps } from '../presenters/timeline';
import { render, route } from '../server/router';

route('GET', '/timeline', ({ state, today }) =>
    render(
        'timeline',
        timelineProps(createReadModel(state, today, new Date())),
    ),
);
