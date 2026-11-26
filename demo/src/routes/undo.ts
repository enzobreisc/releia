import { restoreUndo, UNDO_TTL_SECONDS } from '../domain/undo';
import {
    errorToast,
    redirectBack,
    route,
    type RouteContext,
    type RouteResult,
} from '../server/router';
import { successNotice, translateFor } from './flash';

function undoAction(ctx: RouteContext): RouteResult {
    const { state } = ctx;

    if (restoreUndo(state, ctx.params.token ?? '')) {
        return redirectBack({
            toast: successNotice(translateFor(state, 'Desfeito')),
        });
    }

    return redirectBack({
        toast: errorToast(
            translateFor(state, 'Não dá mais para desfazer'),
            translateFor(state, 'o prazo de :seconds s passou', {
                seconds: UNDO_TTL_SECONDS,
            }),
        ),
    });
}

route('POST', '/undo/{token}', undoAction);
