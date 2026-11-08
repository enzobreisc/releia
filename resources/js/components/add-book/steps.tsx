import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const STEP_LABELS: TranslationKey[] = [
    'buscar',
    'escolher edição',
    'revisar e salvar',
];
const SEARCH_STEP = 1;
const REVIEW_STEP = 3;

export function Steps({ editing }: { editing: boolean }) {
    const { t } = useTranslation();
    const current = editing ? REVIEW_STEP : SEARCH_STEP;

    return (
        <ol
            aria-label={t('Etapas')}
            className="flex flex-wrap rounded-full bg-surface p-1 inset-ring inset-ring-border"
        >
            {STEP_LABELS.map((label, index) => {
                const active = index + 1 === current;

                return (
                    <li
                        key={label}
                        aria-current={active ? 'step' : undefined}
                        className={cn(
                            'flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-bold',
                            active ? 'bg-text text-bg' : 'text-secondary',
                        )}
                    >
                        <span className="font-mono text-[11px] font-normal">
                            {index + 1}
                        </span>
                        {t(label)}
                    </li>
                );
            })}
        </ol>
    );
}
