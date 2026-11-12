import { Button } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import type { Reader } from './types';

export function ReaderSummary({
    reader,
    since,
    onEdit,
}: {
    reader: Reader;
    since: string;
    onEdit: () => void;
}) {
    const { t, monthYear } = useTranslation();

    return (
        <>
            <div className="flex flex-col gap-1.5">
                <h1 className="text-4xl leading-none font-extrabold tracking-tighter">
                    {reader.name ?? t('Seu perfil')}
                </h1>
                <span className="font-mono text-xs text-muted">
                    {t('leitor desde :date', {
                        date: monthYear(`${since}-01`),
                    })}
                </span>
            </div>
            {reader.bio && (
                <p className="text-[15px] leading-relaxed font-medium text-secondary">
                    {reader.bio}
                </p>
            )}
            <Button variant="ghost" onClick={onEdit}>
                {t('Editar perfil')}
            </Button>
        </>
    );
}
