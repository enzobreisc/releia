import { useTranslation } from '@/hooks/use-translation';
import { formatShortcut } from './format-shortcut';
import { WIDGET_REFRESH_URL } from './constants';

export function QuickLogHeader({
    native,
    shortcut,
}: {
    native: boolean;
    shortcut: string;
}) {
    const { t } = useTranslation();

    return (
        <header className="flex items-baseline justify-between">
            <h1 className="text-lg font-extrabold tracking-tight in-data-mobile:text-2xl">
                {t('Leitura do dia')}
            </h1>
            {native ? (
                <span className="font-mono text-[11px] text-muted">
                    {t(':shortcut abre isto', {
                        shortcut: formatShortcut(shortcut),
                    })}
                </span>
            ) : (
                <a
                    href={WIDGET_REFRESH_URL}
                    className="py-2 text-sm font-bold text-link"
                >
                    {t('atualizar widget')}
                </a>
            )}
        </header>
    );
}
