import { router } from '@inertiajs/react';
import { toPng } from 'html-to-image';
import { useRef, useState } from 'react';
import { BookCover } from '@/components/book-cover';
import { buttonClass, Field, Select } from '@/components/form';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
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
    /** Titles reread and finished in the year. */
    rereads: string[];
};

const card =
    'flex min-w-0 flex-[1_1_220px] flex-col gap-2 rounded-md border bg-surface p-5';

/** Highlight card: label, big value and a supporting line. */
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

function readingNote(
    reading: ReadingRef,
    plural: ReturnType<typeof useTranslation>['plural'],
) {
    const parts = [reading.authors];

    if (reading.days !== null) {
        parts.push(plural(reading.days, 'dia', 'dias'));
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
    rereads,
}: WrappedProps) {
    const { t, plural, translateText, ordinal } = useTranslation();
    const exportRef = useRef<HTMLDivElement>(null);
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    /** Renders the content to PNG and triggers the download. Failures show on screen. */
    async function exportImage() {
        if (!exportRef.current) {
            return;
        }

        setExporting(true);
        setExportError(null);

        try {
            const dataUrl = await toPng(exportRef.current, {
                pixelRatio: 2,
                backgroundColor: '#0a0e14',
            });
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `releia-wrapped-${year}.png`;
            link.click();
        } catch {
            // Cross-origin external fonts often prevent reading the CSS.
            setExportError(
                t('Não foi possível gerar a imagem. Tente de novo.'),
            );
        } finally {
            setExporting(false);
        }
    }

    return (
        <>
            <PageHeader title={t('Wrapped')} headTitle={`Wrapped ${year}`} />

            <div className="flex flex-wrap items-end gap-3">
                <Field label={t('Ano')} className="w-40">
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
                    {exporting
                        ? t('Gerando imagem…')
                        : t('Exportar como imagem')}
                </button>
                {exportError && (
                    <p role="alert" className="text-sm text-red-300">
                        {exportError}
                    </p>
                )}
            </div>

            <div
                ref={exportRef}
                className="flex flex-col gap-6 rounded-md bg-bg p-1"
            >
                <section className="flex flex-col gap-3 rounded-md border border-[#243e6b] bg-[#12233f] p-10">
                    <SectionTitle>{t('seu ano em livros')}</SectionTitle>
                    <h2 className="font-mono text-[56px] leading-none font-bold">
                        {year}
                    </h2>
                    <p className="text-lg text-[#a9b8d0]">
                        {t('Você leu')}{' '}
                        <strong className="text-white">
                            {plural(summary.books_read, 'livro', 'livros')}
                        </strong>{' '}
                        {t('e')}{' '}
                        <strong className="text-white">
                            {plural(summary.pages_read, 'página', 'páginas')}
                        </strong>{' '}
                        {t('neste ano.')}
                    </p>
                </section>

                <div className="flex flex-wrap gap-4">
                    <Highlight
                        label={t('gênero favorito')}
                        value={genre ? translateText(genre.label) : '—'}
                        note={
                            genre
                                ? plural(genre.count, 'livro', 'livros')
                                : undefined
                        }
                    />
                    <Highlight
                        label={t('autor mais lido')}
                        value={author?.label ?? '—'}
                        note={
                            author
                                ? plural(author.count, 'livro', 'livros')
                                : undefined
                        }
                    />
                    <Highlight
                        label={t('mais rápido')}
                        value={fastest?.title ?? '—'}
                        note={
                            fastest ? readingNote(fastest, plural) : undefined
                        }
                    />
                    <Highlight
                        label={t('mais longo')}
                        value={longest?.title ?? '—'}
                        note={
                            longest ? readingNote(longest, plural) : undefined
                        }
                    />
                    <Highlight
                        label={t('melhor mês')}
                        value={best_month?.label ?? '—'}
                        note={
                            best_month
                                ? plural(
                                      best_month.count,
                                      'livro concluído',
                                      'livros concluídos',
                                  )
                                : undefined
                        }
                    />
                    <Highlight
                        label={t('maior sequência')}
                        value={plural(streak, 'dia', 'dias')}
                    />
                    {rereads.length > 0 && (
                        <Highlight
                            label={t('releituras do ano')}
                            value={`↻ ${rereads.length}`}
                            note={rereads.join(' · ')}
                        />
                    )}
                </div>

                <section className="flex flex-col gap-4 rounded-md border bg-surface p-5">
                    <SectionTitle>
                        {t('seus 5 melhores do ano (pela nota)')}
                    </SectionTitle>
                    {top.length === 0 ? (
                        <p className="text-sm text-muted">
                            {t('Nenhum livro avaliado neste ano.')}
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
                                        {t(':position · nota :rating', {
                                            position: ordinal(index + 1),
                                            rating: reading.rating ?? '',
                                        })}
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
