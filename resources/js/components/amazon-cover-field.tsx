import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button, Input } from '@/components/form';
import { amazonCover } from '@/routes/books';

/**
 * Pega a capa de um link de produto da Amazon. Só acha a imagem; quem usa
 * decide o que fazer com ela (a capa é baixada ao salvar o livro).
 */
export function AmazonCoverField({
    onFound,
}: {
    onFound: (coverUrl: string) => void;
}) {
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
                setMessage({ ok: true, text: 'Capa encontrada.' });
            } else {
                setMessage({
                    ok: false,
                    text: body.message ?? 'Não foi possível buscar a capa.',
                });
            }
        } catch {
            setMessage({
                ok: false,
                text: 'Sem conexão para buscar a capa.',
            });
        } finally {
            setLoading(false);
        }
    }

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter') {
            // Dentro de um formulário, Enter salvaria o livro.
            event.preventDefault();
            void search();
        }
    }

    return (
        <div className="flex flex-col gap-1.5 text-[13px] text-muted">
            <label htmlFor="amazon-cover-link">Capa pelo link da Amazon</label>
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
                    {loading ? 'buscando…' : 'buscar capa'}
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
