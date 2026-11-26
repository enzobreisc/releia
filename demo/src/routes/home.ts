import { render, route } from '../server/router';
import { homeProps } from '../presenters/home';
import { createReadModel } from '../domain/read-model';
import { pickSuggestionOfDay } from '../domain/suggestion';

route('GET', '/', ({ state, today }) => {
    const model = createReadModel(state, today, new Date());

    return render('home', homeProps(model, pickSuggestionOfDay(model)));
});
