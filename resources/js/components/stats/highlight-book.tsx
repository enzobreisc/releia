import { Link } from '@inertiajs/react';
import { BookCover } from '@/components/book-cover';
import { cardClass } from '@/components/card';
import { useReadingNote } from '@/hooks/use-reading-note';
import { show as bookShow } from '@/routes/books';
import type { ReadingRef } from '@/types';
import { EMPTY_VALUE } from '@/lib/format';

export function HighlightBook({
    label,
    reading,
}: {
    label: string;
    reading: ReadingRef | null;
}) {
    const note = useReadingNote(reading);
    const className = cardClass('flex items-center gap-3.5 p-4.5');
    const body = (
        <>
            {reading && (
                <BookCover
                    src={reading.cover_url}
                    title={reading.title}
                    className="w-10"
                />
            )}
            <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-xs font-bold text-muted first-letter:uppercase">
                    {label}
                </span>
                <span className="text-[15px] font-extrabold">
                    {reading?.title ?? EMPTY_VALUE}
                </span>
                {note && (
                    <span className="font-mono text-xs text-muted">{note}</span>
                )}
            </span>
        </>
    );

    return reading ? (
        <Link href={bookShow.url(reading.id)} className={className}>
            {body}
        </Link>
    ) : (
        <div className={className}>{body}</div>
    );
}
