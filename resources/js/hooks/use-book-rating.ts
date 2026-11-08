import { router } from '@inertiajs/react';
import { useState } from 'react';
import { reading as readingRoute } from '@/routes/books';

export function useBookRating(bookId: number) {
    const [rating, setRating] = useState<number | null>(null);

    function rate(value: number | null) {
        setRating(value);
        router.patch(
            readingRoute.url(bookId),
            { rating: value },
            { preserveState: true, preserveScroll: true },
        );
    }

    return { rating, rate };
}
