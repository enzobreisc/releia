import { useEffect, useState } from 'react';
import { extractCoverColors } from '@/lib/shelf/cover-colors';
import type { CoverColors } from '@/lib/shelf/cover-colors';
import { resolveSpineColors } from '@/lib/shelf/spine-colors';
import type { SpineColors } from '@/lib/shelf/spine-colors';
import type { SpineBook } from '@/types';

const UNKNOWN_COVER: CoverColors = { ground: null, accent: null };

export function useSpineColors(book: SpineBook): SpineColors {
    const [cover, setCover] = useState<CoverColors>(UNKNOWN_COVER);

    useEffect(() => {
        let isActive = true;

        if (book.cover_url) {
            void extractCoverColors(book.cover_url).then(
                (found) => isActive && setCover(found),
            );
        }

        return () => {
            isActive = false;
        };
    }, [book.cover_url]);

    return resolveSpineColors(book, cover);
}
