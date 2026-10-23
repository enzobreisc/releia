import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button, Input } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { amazonCover } from '@/routes/books';

/**
 * Gets the cover from an Amazon product link. It only finds the image; the caller
 * decides what to do with it (the cover is downloaded when the book is saved).
 */
export function AmazonCoverField({
    onFound,
}: {
    onFound: (coverUrl: string) => void;
}) {
    const { t } = useTranslation();
    const [link, setLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string }>();

    async function search() {
        if (link.trim() === '' || loading) {
            return;
        }

        setLoading(true);
        setMessage(undefined);

        try {
            const response = await fetch(
                amazonCover.url({ query: { url: link.trim() } }),
                { headers: { Accept: 'application/json' } },
            );
            const body = (await response.json()) as {
                cover_url?: string;
                message?: string;
            };

            if (response.ok && body.cover_url) {
                onFound(body.cover_url);
                setMessage({ ok: true, text: t('Capa encontrada.') });
            } else {
                setMessage({
                    ok: false,
                    text: body.message ?? t('Não foi possível buscar a capa.'),
                });
            }
        } catch {
            setMessage({
                ok: false,
                text: t('Sem conexão para buscar a capa.'),
            });
        } finally {
            setLoading(false);
        }
    }

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter') {
            // Inside a form, Enter would save the book.
            event.preventDefault();
            void search();
        }
    }

    return (
        <div className="flex flex-col gap-1.5 text-xs font-bold text-muted">
            <label htmlFor="amazon-cover-link">
                {t('Capa pelo link da Amazon')}
            </label>
            <div className="flex gap-2">
                <Input
                    id="amazon-cover-link"
                    type="url"
                    value={link}
                    placeholder="https://www.amazon.com.br/dp/…"
                    onChange={(event) => setLink(event.target.value)}
                    onKeyDown={onKeyDown}
                    className="h-9 min-w-0 flex-1 text-[13px]"
                />
                <Button
                    variant="outline"
                    disabled={loading || link.trim() === ''}
                    onClick={() => void search()}
                    className="h-9 px-3 text-[13px]"
                >
                    {loading ? t('buscando…') : t('buscar capa')}
                </Button>
            </div>
            {message && (
                <span
                    role="status"
                    className={message.ok ? 'text-accent' : 'text-danger'}
                >
                    {message.text}
                </span>
            )}
        </div>
    );
}
