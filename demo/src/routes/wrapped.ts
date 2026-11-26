import { createReadModel } from '../domain/read-model';
import { render, route } from '../server/router';
import { wrappedProps } from '../presenters/wrapped';

route('GET', '/wrapped', ({ state, query, today }) => {
    const model = createReadModel(state, today, new Date());

    return render('wrapped', wrappedProps(model, query.get('year')));
});
