import { statsProps } from '../presenters/stats';
import { createReadModel } from '../domain/read-model';
import { render, route } from '../server/router';

route('GET', '/stats', ({ state, query, today }) => {
    const model = createReadModel(state, today, new Date());

    return render('stats', statsProps(model, query.get('year')));
});
