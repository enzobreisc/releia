import type { FormEvent } from 'react';
import { AmazonCoverField } from '@/components/amazon-cover-field';
import { cardClass } from '@/components/card';
import { Button } from '@/components/form';
import { SectionTitle } from '@/components/page-header';
import {
    type BookFormHandle,
    MANUAL_SOURCE,
    SOURCE_NAMES,
} from '@/components/add-book/book-form';
import { BookSummary } from '@/components/add-book/book-summary';
import { EmptyReview } from '@/components/add-book/empty-review';
import { MoreFieldsSection } from '@/components/add-book/more-fields';
import { PagesGenreFields } from '@/components/add-book/pages-genre-fields';
import { ReadingStatusField } from '@/components/add-book/reading-status-field';
import { TitleAuthorFields } from '@/components/add-book/title-author-fields';
import { useTranslation } from '@/hooks/use-translation';
import type { Option } from '@/types';

type ReviewPanelProps = {
    form: BookFormHandle;
    editing: boolean;
    statuses: Option[];
    genres: string[];
    showMore: boolean;
    onToggleMore: () => void;
    onSubmit: (event: FormEvent) => void;
};

export function ReviewPanel({
    form,
    editing,
    statuses,
    genres,
    showMore,
    onToggleMore,
    onSubmit,
}: ReviewPanelProps) {
    const { t } = useTranslation();
    const sourceName = SOURCE_NAMES[form.data.source] ?? form.data.source;

    return (
        <form
            aria-label={t('Revisar livro')}
            onSubmit={onSubmit}
            className={cardClass(
                'flex min-w-0 flex-[2_1_340px] flex-col gap-4.5 rounded-lg p-6',
            )}
        >
            <div className="flex items-baseline justify-between gap-3">
                <SectionTitle>{t('Revisar livro')}</SectionTitle>
                {editing && (
                    <span className="font-mono text-[11px] text-muted">
                        {form.data.source === MANUAL_SOURCE
                            ? t('manual')
                            : t('fonte: :source', { source: sourceName })}
                    </span>
                )}
            </div>

            {editing ? (
                <>
                    <BookSummary
                        coverUrl={form.data.cover_url || null}
                        title={form.data.title}
                        authors={form.data.authors}
                    />
                    <TitleAuthorFields form={form} />
                    <AmazonCoverField
                        onFound={(coverUrl) =>
                            form.setData('cover_url', coverUrl)
                        }
                    />
                    <PagesGenreFields form={form} genres={genres} />
                    <MoreFieldsSection
                        form={form}
                        expanded={showMore}
                        onToggle={onToggleMore}
                    />
                    <ReadingStatusField form={form} statuses={statuses} />
                </>
            ) : (
                <EmptyReview />
            )}

            <span className="text-[13px] font-medium text-muted">
                {t('Tudo pode ser editado antes de salvar.')}
            </span>
            <Button
                type="submit"
                disabled={!editing || form.processing}
                className="h-12 text-sm"
            >
                {form.processing ? t('Salvando…') : t('Salvar na biblioteca')}
                <span className="font-mono text-[11px] font-normal opacity-70">
                    ⌘↵
                </span>
            </Button>
        </form>
    );
}
