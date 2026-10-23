import { router } from '@inertiajs/react';
import { toPng } from 'html-to-image';
import { useRef, useState } from 'react';
import { BookCover } from '@/components/book-cover';
import { Button, Segmented } from '@/components/form';
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

const DECORATION_LEVELS = [
    1, 2, 3, 2, 1, 0, 2, 3, 2, 1, 0, 0, 3, 2, 1, 0, 0, 0,
];

const DECORATION_CLASSES = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3'];

function Fact({
    label,
    value,
    note,
}: {
    label: string;
    value: string;
    note?: string;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-1.5 rounded-md bg-white/3 p-4.5 inset-ring inset-ring-border">
            <span className="text-xs font-bold text-muted">{label}</span>
            <span className="text-[22px] font-extrabold tracking-tight break-words">
                {value}
            </span>
            {note && (
                <span className="font-mono text-[11px] text-muted">{note}</span>
            )}
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

    async function exportImage() {
        if (!exportRef.current) {
            return;
        }

        setExporting(true);
        setExportError(null);

        try {
            const dataUrl = await toPng(exportRef.current, {
                pixelRatio: 2,
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
            <PageHeader
                title={t('Wrapped')}
                headTitle={`Wrapped ${year}`}
                actions={
                    <div className="flex flex-wrap items-center gap-2.5">
                        <Segmented
                            options={years.map((option) => ({
                                value: String(option),
                                label: String(option),
                            }))}
                            value={String(year)}
                            onChange={(option) =>
                                router.get(
                                    wrappedShow.url(),
                                    { year: option },
                                    { preserveScroll: true, replace: true },
                                )
                            }
                        />
                        <Button onClick={exportImage} disabled={exporting}>
                            {exporting
                                ? t('Gerando imagem…')
                                : t('Exportar como imagem')}
                        </Button>
                    </div>
                }
            />

            {exportError && (
                <p role="alert" className="text-sm text-danger">
                    {exportError}
                </p>
            )}

            <article
                ref={exportRef}
                aria-label={t('seu ano em livros')}
                className="relative flex flex-col gap-10 overflow-hidden rounded-[28px] bg-surface p-[clamp(28px,4vw,56px)] inset-ring inset-ring-strong"
            >
                <div
                    aria-hidden="true"
                    className="absolute -top-10 -right-10 grid grid-cols-[repeat(6,44px)] gap-2 opacity-50"
                >
                    {DECORATION_LEVELS.map((level, index) => (
                        <span
                            key={index}
                            className={`h-11 rounded-[9px] ${DECORATION_CLASSES[level]}`}
                        />
                    ))}
                </div>

                <div className="relative flex max-w-190 flex-col gap-3.5">
                    <span className="text-xs font-extrabold tracking-widest text-muted uppercase">
                        releia · {t('seu ano em livros')} · {year}
                    </span>
                    <p className="text-[clamp(40px,5vw,68px)] leading-[0.98] font-extrabold tracking-[-0.045em]">
                        {t('Você leu')}{' '}
                        <span className="text-link">
                            {plural(summary.books_read, 'livro', 'livros')}
                        </span>{' '}
                        {t('e')}{' '}
                        <span className="text-link">
                            {plural(summary.pages_read, 'página', 'páginas')}
                        </span>{' '}
                        {t('neste ano.')}
                    </p>
                </div>

                <div className="relative grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-3">
                    <Fact
                        label={t('gênero favorito')}
                        value={genre ? translateText(genre.label) : '—'}
                        note={
                            genre
                                ? plural(genre.count, 'livro', 'livros')
                                : undefined
                        }
                    />
                    <Fact
                        label={t('autor mais lido')}
                        value={author?.label ?? '—'}
                        note={
                            author
                                ? plural(author.count, 'livro', 'livros')
                                : undefined
                        }
                    />
                    <Fact
                        label={t('mais rápido')}
                        value={fastest?.title ?? '—'}
                        note={
                            fastest ? readingNote(fastest, plural) : undefined
                        }
                    />
                    <Fact
                        label={t('mais longo')}
                        value={longest?.title ?? '—'}
                        note={
                            longest ? readingNote(longest, plural) : undefined
                        }
                    />
                    <Fact
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
                    <Fact
                        label={t('maior sequência')}
                        value={plural(streak, 'dia', 'dias')}
                    />
                    {rereads.length > 0 && (
                        <Fact
                            label={t('releituras do ano')}
                            value={`↻ ${rereads.length}`}
                            note={rereads.join(' · ')}
                        />
                    )}
                </div>

                <section className="relative flex flex-col gap-4.5">
                    <SectionTitle>
                        {t('seus 5 melhores do ano (pela nota)')}
                    </SectionTitle>
                    {top.length === 0 ? (
                        <p className="text-sm text-muted">
                            {t('Nenhum livro avaliado neste ano.')}
                        </p>
                    ) : (
                        <ol className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-5">
                            {top.map((reading, index) => (
                                <li
                                    key={`${reading.id}-${index}`}
                                    className="flex flex-col gap-2.5"
                                >
                                    <div className="relative">
                                        <BookCover
                                            src={reading.cover_url}
                                            title={reading.title}
                                            className="w-full"
                                        />
                                        <span
                                            aria-hidden="true"
                                            className="absolute top-2 left-2.5 text-[34px] leading-none font-extrabold tracking-tighter text-text/90 [text-shadow:0_2px_12px_rgb(0_0_0/0.8)]"
                                        >
                                            {index + 1}
                                        </span>
                                    </div>
                                    <span className="flex flex-col gap-0.5">
                                        <span className="text-sm font-extrabold">
                                            {reading.title}
                                        </span>
                                        <span className="font-mono text-[11px] text-muted">
                                            {t(':position · nota :rating', {
                                                position: ordinal(index + 1),
                                                rating: reading.rating ?? '',
                                            })}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </article>
        </>
    );
}
