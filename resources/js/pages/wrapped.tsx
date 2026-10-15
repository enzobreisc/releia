import { router } from '@inertiajs/react';
import { toPng } from 'html-to-image';
import { useRef, useState } from 'react';
import { BookCover } from '@/components/book-cover';
import { buttonClass, Field, Select } from '@/components/form';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { show as wrappedShow } from '@/routes/wrapped';
import type { NamedCount, ReadingRef } from '@/types';

type WrappedProps = {
    year: number;
    years: number[];
    summary: { books_read: number; pages_read: number };
    genre: NamedCount | null;
    author: NamedCount | null;
    fastest: ReadingRef | null;
    longest: ReadingRef | null;
    best_month: { label: string; count: number } | null;
    streak: number;
    top: ReadingRef[];
};

const card =
    'flex min-w-0 flex-[1_1_220px] flex-col gap-2 rounded-md border bg-surface p-5';

/** Cartão de destaque: rótulo, valor grande e uma linha de apoio. */
function Highlight({
    label,
    value,
    note,
}: {
    label: string;
    value: string;
    note?: string;
}) {
    return (
        <div className={card}>
            <SectionTitle>{label}</SectionTitle>
            <span className="font-mono text-[26px] font-bold break-words">
                {value}
            </span>
            {note && <span className="text-[13px] text-muted">{note}</span>}
        </div>
    );
}

function readingNote(reading: ReadingRef) {
    const parts = [reading.authors];

    if (reading.days !== null) {
        parts.push(`${reading.days} ${reading.days === 1 ? 'dia' : 'dias'}`);
    }

    return parts.filter(Boolean).join(' · ');
}

export default function Wrapped({
    year,
    years,
    summary,
    genre,
    author,
    fastest,
    longest,
    best_month,
    streak,
    top,
}: WrappedProps) {
    const exportRef = useRef<HTMLDivElement>(null);
    const [exporting, setExporting] = useState(false);

    /** Gera o PNG do conteúdo e dispara o download. */
    async function exportImage() {
        if (!exportRef.current) {
            return;
        }

        setExporting(true);

        try {
            const dataUrl = await toPng(exportRef.current, {
                pixelRatio: 2,
                backgroundColor: '#0a0e14',
            });
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `releia-wrapped-${year}.png`;
            link.click();
        } finally {
            setExporting(false);
        }
    }

    return (
        <>
            <PageHeader title="Wrapped" headTitle={`Wrapped ${year}`} />

            <div className="flex flex-wrap items-end gap-3">
                <Field label="Ano" className="w-40">
                    <Select
                        value={String(year)}
                        onChange={(event) =>
                            router.get(
                                wrappedShow.url(),
                                { year: event.target.value },
                                { preserveScroll: true, replace: true },
                            )
                        }
                    >
                        {years.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </Select>
                </Field>
                <button
                    type="button"
                    onClick={exportImage}
                    disabled={exporting}
                    className={buttonClass('ghost')}
                >
                    {exporting ? 'Gerando imagem…' : 'Exportar como imagem'}
                </button>
            </div>

            <div
                ref={exportRef}
                className="flex flex-col gap-6 rounded-md bg-bg p-1"
            >
                <section className="flex flex-col gap-3 rounded-md border border-[#243e6b] bg-[#12233f] p-10">
                    <SectionTitle>seu ano em livros</SectionTitle>
                    <h2 className="font-mono text-[56px] leading-none font-bold">
                        {year}
                    </h2>
                    <p className="text-lg text-[#a9b8d0]">
                        Você leu{' '}
                        <strong className="text-white">
                            {summary.books_read}{' '}
                            {summary.books_read === 1 ? 'livro' : 'livros'}
                        </strong>{' '}
                        e{' '}
                        <strong className="text-white">
                            {summary.pages_read} páginas
                        </strong>{' '}
                        neste ano.
                    </p>
                </section>

                <div className="flex flex-wrap gap-4">
                    <Highlight
                        label="gênero favorito"
                        value={genre?.label ?? '—'}
                        note={
                            genre
                                ? `${genre.count} ${genre.count === 1 ? 'livro' : 'livros'}`
                                : undefined
                        }
                    />
                    <Highlight
                        label="autor mais lido"
                        value={author?.label ?? '—'}
                        note={
                            author
                                ? `${author.count} ${author.count === 1 ? 'livro' : 'livros'}`
                                : undefined
                        }
                    />
                    <Highlight
                        label="mais rápido"
                        value={fastest?.title ?? '—'}
                        note={fastest ? readingNote(fastest) : undefined}
                    />
                    <Highlight
                        label="mais longo"
                        value={longest?.title ?? '—'}
                        note={longest ? readingNote(longest) : undefined}
                    />
                    <Highlight
                        label="melhor mês"
                        value={best_month?.label ?? '—'}
                        note={
                            best_month
                                ? `${best_month.count} ${best_month.count === 1 ? 'livro concluído' : 'livros concluídos'}`
                                : undefined
                        }
                    />
                    <Highlight
                        label="maior sequência"
                        value={`${streak} ${streak === 1 ? 'dia' : 'dias'}`}
                    />
                </div>

                <section className="flex flex-col gap-4 rounded-md border bg-surface p-5">
                    <SectionTitle>
                        seus 5 melhores do ano (pela nota)
                    </SectionTitle>
                    {top.length === 0 ? (
                        <p className="text-sm text-muted">
                            Nenhum livro avaliado neste ano.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-5">
                            {top.map((reading, index) => (
                                <div
                                    key={`${reading.id}-${index}`}
                                    className="flex w-24 flex-col gap-1.5"
                                >
                                    <BookCover
                                        src={reading.cover_url}
                                        title={reading.title}
                                        className="w-24"
                                    />
                                    <span className="text-xs text-muted">
                                        {index + 1}º · nota {reading.rating}
                                    </span>
                                    <span className="text-xs leading-tight">
                                        {reading.title}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
