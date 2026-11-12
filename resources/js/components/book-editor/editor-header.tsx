import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export function EditorHeader({ changed }: { changed: number }) {
    const { t, plural } = useTranslation();

    return (
        <>
            <div className="flex h-9 shrink-0 app-drag" />
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 pb-4">
                <h2 className="text-xl font-extrabold tracking-tight first-letter:uppercase">
                    {t('editar dados')}
                </h2>
                <span
                    className={cn(
                        'font-mono text-xs',
                        changed > 0 ? 'text-warn' : 'text-faint',
                    )}
                >
                    {changed === 0
                        ? t('sem alterações')
                        : plural(changed, 'alteração', 'alterações')}
                </span>
            </div>
        </>
    );
}
