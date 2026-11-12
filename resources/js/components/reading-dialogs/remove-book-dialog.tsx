import { router } from '@inertiajs/react';
import { Dialog, DialogList } from '@/components/dialog';
import { useTranslation } from '@/hooks/use-translation';
import { destroy as destroyBook } from '@/routes/books';
import { CancelButton } from './cancel-button';
import { DangerButton } from './danger-button';

export type Removal = {
    readings: number;
    finished: number;
    sessions: number;
    pages: number;
    notes: number;
};

export function RemoveBookDialog({
    bookId,
    title,
    removal,
    queued,
    onClose,
}: {
    bookId: number;
    title: string;
    removal: Removal;
    queued: boolean;
    onClose: () => void;
}) {
    const { t, plural } = useTranslation();
    const items = [
        removal.readings > 1
            ? t(':readings (:finished)', {
                  readings: plural(removal.readings, 'leitura', 'leituras'),
                  finished: plural(removal.finished, 'terminada', 'terminadas'),
              })
            : plural(removal.readings, 'leitura', 'leituras'),
        removal.sessions > 0 &&
            `${plural(removal.sessions, 'sessão', 'sessões')} · ${plural(removal.pages, 'página', 'páginas')}`,
        removal.notes > 0 && plural(removal.notes, 'nota', 'notas'),
        queued && t('a posição na fila'),
    ].filter((item): item is string => typeof item === 'string');

    return (
        <Dialog title={`## ${t('remover livro?')}`} onClose={onClose}>
            <p className="text-sm leading-relaxed text-secondary">
                {t(
                    ':title sai da biblioteca junto com tudo o que foi registrado nele:',
                    { title },
                )}
            </p>
            <DialogList items={items} />
            <p className="text-xs text-muted">
                {t('Não dá para desfazer.')}
                {removal.finished > 0 &&
                    ` ${t('As estatísticas dos anos em que você leu este livro vão mudar.')}`}
            </p>
            <div className="flex justify-end gap-2">
                <CancelButton autoFocus onClick={onClose} />
                <DangerButton onClick={() => router.visit(destroyBook(bookId))}>
                    {t('Remover livro')}
                </DangerButton>
            </div>
        </Dialog>
    );
}
