import { Button } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import type { Candidate } from '@/types';
import type { Diff } from './types';

export function LookupSuggestions({
    lookup,
    diffs,
    picked,
    searching,
    dismissed,
    onPick,
    onApply,
}: {
    lookup: Candidate | null | undefined;
    diffs: Diff[];
    picked: Record<string, boolean>;
    searching: boolean;
    dismissed: boolean;
    onPick: (key: Diff['key'], isPicked: boolean) => void;
    onApply: () => void;
}) {
    const { t } = useTranslation();

    return (
        <>
            {diffs.length > 0 && (
                <div className="flex flex-col gap-2 rounded-md bg-active p-4 inset-ring inset-ring-primary">
                    <span className="text-[13px] font-semibold">
                        {t('A fonte tem dados diferentes')}
                    </span>
                    {diffs.map((diff) => (
                        <label
                            key={diff.key}
                            className="grid grid-cols-[18px_72px_minmax(0,1fr)] items-start gap-2 text-xs"
                        >
                            <input
                                type="checkbox"
                                checked={picked[diff.key] !== false}
                                onChange={(event) =>
                                    onPick(diff.key, event.target.checked)
                                }
                                className="mt-0.5 size-3.5 accent-primary"
                            />
                            <span className="text-muted">{t(diff.label)}</span>
                            <span className="line-clamp-2">
                                <span className="text-muted line-through">
                                    {diff.from}
                                </span>{' '}
                                → <strong>{diff.to}</strong>
                            </span>
                        </label>
                    ))}
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted">
                            {t('Só aplica o marcado. Nada muda sem salvar.')}
                        </span>
                        <Button
                            variant="ghost"
                            onClick={onApply}
                            className="h-8 px-3 text-xs"
                        >
                            {t('Aplicar')}
                        </Button>
                    </div>
                </div>
            )}
            {lookup === null && !searching && !dismissed && (
                <p className="text-xs text-muted">
                    {t('Nada encontrado para este ISBN.')}
                </p>
            )}
            {lookup && diffs.length === 0 && !dismissed && (
                <p className="text-xs text-muted">
                    {t('A fonte não tem nada diferente do que está aqui.')}
                </p>
            )}
        </>
    );
}
