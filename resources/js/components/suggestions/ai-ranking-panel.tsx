import { useId } from 'react';
import { cardClass } from '@/components/card';
import { Switch } from '@/components/switch';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
import type { AiAvailability, AiRanking } from '@/types';

const AVAILABILITY_MESSAGES: Record<AiAvailability, TranslationKey> = {
    ready: 'IA local disponível',
    server_unreachable:
        'O Ollama não está rodando. As sugestões seguem pela pontuação.',
    model_missing: 'Falta o modelo. Rode: ollama pull :model',
};

export function AiRankingPanel({
    ranking,
    availability,
    isBusy,
    onToggle,
}: {
    ranking: AiRanking;
    availability?: AiAvailability | null;
    isBusy: boolean;
    onToggle: (enabled: boolean) => void;
}) {
    const { t } = useTranslation();
    const titleId = useId();
    const descriptionId = useId();

    return (
        <section
            aria-labelledby={titleId}
            className={cardClass('flex flex-col gap-3.5 p-4.5')}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                    <h2 id={titleId} className="text-[15px] font-extrabold">
                        {t('Ordenar com IA local (experimental)')}
                    </h2>
                    <p
                        id={descriptionId}
                        className="text-[13px] leading-normal font-medium text-secondary"
                    >
                        {t(
                            'Usa o Ollama no seu computador para aproximar as sugestões dos livros que você avaliou. Nada sai da sua máquina.',
                        )}
                    </p>
                </div>
                <Switch
                    checked={ranking.enabled}
                    disabled={isBusy}
                    labelledBy={titleId}
                    describedBy={descriptionId}
                    onCheckedChange={onToggle}
                />
            </div>

            {ranking.enabled && (
                <AvailabilityStatus
                    availability={availability}
                    model={ranking.model}
                />
            )}
        </section>
    );
}

function AvailabilityStatus({
    availability,
    model,
}: {
    availability?: AiAvailability | null;
    model: string;
}) {
    const { t } = useTranslation();

    if (!availability) {
        return (
            <p role="status" className="text-xs text-muted">
                {t('Verificando o Ollama…')}
            </p>
        );
    }

    return (
        <p role="status" className="text-xs text-muted">
            {t(AVAILABILITY_MESSAGES[availability], { model })}
        </p>
    );
}
