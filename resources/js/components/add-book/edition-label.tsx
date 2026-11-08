import { isBrazilianIsbn } from '@/lib/editions';
import type { Candidate } from '@/types';

export function EditionLabel({
    edition,
    meta,
}: {
    edition: Candidate;
    meta: (string | number | null | undefined)[];
}) {
    return (
        <>
            <span className="min-w-0 flex-1 text-[13px] font-bold">
                {edition.publisher ?? edition.title}
                {meta.length > 0 && (
                    <span className="font-mono text-xs font-normal text-muted">
                        {' '}
                        · {meta.join(' · ')}
                    </span>
                )}
            </span>
            {isBrazilianIsbn(edition.isbn_13) && (
                <span className="font-mono text-[11px] text-link">pt-BR</span>
            )}
            <span className="font-mono text-xs text-muted">
                {edition.isbn_13}
            </span>
        </>
    );
}
