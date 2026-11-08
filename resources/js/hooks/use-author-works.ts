import { useEffect, useState } from 'react';
import { JSON_HEADERS } from '@/lib/http';
import { works as worksRoute } from '@/routes/authors';

export type Work = {
    title: string;
    year: number | null;
    cover_url: string | null;
    work_key: string | null;
    edition_count: number | null;
    portuguese: boolean;
};

export type Works = { verified: boolean; items: Work[] };

/** Works missing from the library, from Open Library by the author's keys. */
export function useAuthorWorks(authorId: number): {
    works: Works | null;
    hasFailed: boolean;
} {
    const [works, setWorks] = useState<Works | null>(null);
    const [hasFailed, setHasFailed] = useState(false);

    useEffect(() => {
        let active = true;

        fetch(worksRoute.url(authorId), { headers: JSON_HEADERS })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Works request failed: ${response.status}`);
                }

                return response.json();
            })
            .then((data: Works) => active && setWorks(data))
            .catch(() => active && setHasFailed(true));

        return () => {
            active = false;
        };
    }, [authorId]);

    return { works, hasFailed };
}
