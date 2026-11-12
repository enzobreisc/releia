import { useEffect, useState } from 'react';
import { JSON_HEADERS } from '@/lib/http';
import { lookUpPhoto } from '@/routes/authors';

export function useAuthorPhoto(author: {
    id: number;
    photo_url: string | null;
}): string | null {
    const [fetchedUrl, setFetchedUrl] = useState<string | null>(null);

    useEffect(() => {
        if (author.photo_url !== null) {
            return;
        }

        let active = true;

        fetch(lookUpPhoto.url(author.id), { headers: JSON_HEADERS })
            .then((response) => (response.ok ? response.json() : null))
            .then(
                (data: { photo_url: string | null } | null) =>
                    active && setFetchedUrl(data?.photo_url ?? null),
            )
            .catch(() => undefined);

        return () => {
            active = false;
        };
    }, [author.id, author.photo_url]);

    return author.photo_url ?? fetchedUrl;
}
