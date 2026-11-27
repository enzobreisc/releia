import type { ReactNode } from 'react';
import { cardClass } from '@/components/card';
import { Button } from '@/components/form';
import type {
    FailureReason,
    RequestActions,
    RequestNotice,
} from '@/hooks/use-suggestion-request';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { RequestExamples } from './request-examples';

type Translate = ReturnType<typeof useTranslation>['t'];

type BoxedNotice = Exclude<RequestNotice, { kind: 'few-results' }>;

type NoticeAction = { label: string; onClick: () => void; disabled?: boolean };

type NoticeCopy = {
    title: string;
    body?: string;
    action?: NoticeAction;
    isWarning?: boolean;
};

type StatusActions = Pick<
    RequestActions,
    'cancel' | 'retry' | 'pickExample' | 'checkAvailabilityAgain' | 'focusField'
>;

const FEW_RESULTS_ONE = 'Só :count livro novo para este pedido.';
const FEW_RESULTS_MANY = 'Só :count livros novos para este pedido.';

/** The container stays mounted so screen readers announce every change inside it. */
export function RequestStatus({
    notice,
    model,
    isChecking,
    isFieldDisabled,
    actions,
}: {
    notice: RequestNotice | null;
    model: string;
    isChecking: boolean;
    isFieldDisabled: boolean;
    actions: StatusActions;
}) {
    const { t } = useTranslation();

    return (
        <div role="status" className="flex flex-col">
            {notice?.kind === 'few-results' && (
                <p className="text-[15px] font-bold">
                    {t(
                        notice.count === 1 ? FEW_RESULTS_ONE : FEW_RESULTS_MANY,
                        {
                            count: notice.count,
                        },
                    )}
                </p>
            )}
            {notice !== null && notice.kind !== 'few-results' && (
                <NoticeBox
                    copy={copyOf(notice, { t, model, isChecking, actions })}
                >
                    {notice.kind === 'not-understood' && (
                        <RequestExamples
                            isDisabled={isFieldDisabled}
                            onPick={actions.pickExample}
                        />
                    )}
                </NoticeBox>
            )}
        </div>
    );
}

function NoticeBox({
    copy,
    children,
}: {
    copy: NoticeCopy;
    children?: ReactNode;
}) {
    return (
        <section
            className={cn(
                'flex flex-col gap-2 p-4.5',
                copy.isWarning
                    ? 'rounded-md bg-warn-fill inset-ring inset-ring-warn-line'
                    : cardClass(),
            )}
        >
            <p
                className={cn(
                    'text-[15px] font-extrabold',
                    copy.isWarning && 'text-warn',
                )}
            >
                {copy.title}
            </p>
            {copy.body && (
                <p className="text-sm leading-normal text-secondary">
                    {copy.body}
                </p>
            )}
            {children}
            {copy.action && (
                <Button
                    variant="ghost"
                    className="self-start"
                    disabled={copy.action.disabled}
                    onClick={copy.action.onClick}
                >
                    {copy.action.label}
                </Button>
            )}
        </section>
    );
}

function failureCopy(
    reason: FailureReason,
    t: Translate,
): Pick<NoticeCopy, 'title' | 'body'> {
    switch (reason) {
        case 'timeout':
            return {
                title: t('Não foi possível pedir sugestões'),
                body: t(
                    'O modelo demorou demais para responder. Tente de novo.',
                ),
            };
        case 'open-library':
            return {
                title: t('A Open Library está indisponível'),
                body: t('Tente de novo em alguns minutos.'),
            };
        case 'unknown':
            return {
                title: t('Não foi possível pedir sugestões'),
                body: t('Não deu para concluir o pedido. Tente de novo.'),
            };
    }
}

function copyOf(
    notice: BoxedNotice,
    context: {
        t: Translate;
        model: string;
        isChecking: boolean;
        actions: StatusActions;
    },
): NoticeCopy {
    const { t, model, isChecking, actions } = context;

    switch (notice.kind) {
        case 'interpreting':
            return {
                title: t('Lendo o seu pedido…'),
                body: t(
                    'O modelo roda no seu Mac. O primeiro pedido demora mais, enquanto ele é carregado.',
                ),
                action: { label: t('Cancelar'), onClick: actions.cancel },
            };
        case 'searching':
            return {
                title: t('Procurando livros…'),
                body: t('Os resultados vêm da Open Library.'),
            };
        case 'unavailable':
            return notice.availability === 'server_unreachable'
                ? {
                      title: t('O Ollama não está rodando'),
                      body: t(
                          'Abra o Ollama para pedir sugestões. As pendentes continuam disponíveis.',
                      ),
                      action: {
                          label: t('Tentar de novo'),
                          onClick: actions.checkAvailabilityAgain,
                          disabled: isChecking,
                      },
                      isWarning: true,
                  }
                : {
                      title: t('Falta o modelo'),
                      body: t('Rode no Terminal: ollama pull :model', {
                          model,
                      }),
                      action: {
                          label: t('Verificar de novo'),
                          onClick: actions.checkAvailabilityAgain,
                          disabled: isChecking,
                      },
                      isWarning: true,
                  };
        case 'not-understood':
            return {
                title: t('Não entendi o pedido'),
                body: t(
                    'Cite um autor, um autor a evitar ou um limite de páginas, ou escolha um dos exemplos.',
                ),
            };
        case 'failed':
            return {
                ...failureCopy(notice.reason, t),
                action: { label: t('Tentar de novo'), onClick: actions.retry },
            };
        case 'no-results':
            return {
                title: t('Nenhum livro novo para este pedido'),
                body: t(
                    'Os que a busca achou já estão na sua biblioteca ou não têm edição brasileira.',
                ),
                action: {
                    label: t('Pedir de outro jeito'),
                    onClick: actions.focusField,
                },
            };
    }
}
