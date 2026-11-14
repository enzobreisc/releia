import { useState } from 'react';
import { Field, Textarea } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import type { BookDetail, Candidate } from '@/types';
import { AuthorsField } from './book-editor/authors-field';
import { CoverPanel } from './book-editor/cover-panel';
import { DiscardConfirmation } from './book-editor/discard-confirmation';
import { EditorFooter } from './book-editor/editor-footer';
import { EditorHeader } from './book-editor/editor-header';
import { IsbnField } from './book-editor/isbn-field';
import { LookupSuggestions } from './book-editor/lookup-suggestions';
import { PagesGenreFields } from './book-editor/pages-genre-fields';
import { PublisherYearFields } from './book-editor/publisher-year-fields';
import { SeriesFields } from './book-editor/series-fields';
import { TitleSection } from './book-editor/title-section';
import { useBookEditorForm } from './book-editor/use-book-editor-form';
import { useLookupSuggestions } from './book-editor/use-lookup-suggestions';

/** Fixes what came wrong from the registration. */
export function BookEditor({
    book,
    genres,
    lookup,
    onClose,
    onShowSessions,
}: {
    book: BookDetail;
    genres: string[];
    lookup: Candidate | null | undefined;
    onClose: () => void;
    onShowSessions: () => void;
}) {
    const { t } = useTranslation();
    const { form, changed, confirmClose, keepEditing, requestClose, save } =
        useBookEditorForm(book, onClose);
    const suggestions = useLookupSuggestions(form, lookup);
    const [coverOpen, setCoverOpen] = useState(false);

    const preview = form.data.cover_file
        ? URL.createObjectURL(form.data.cover_file)
        : form.data.cover_url || book.cover_url;

    return (
        <div
            className="fixed inset-0 z-40 bg-[rgba(3,6,10,0.55)]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    requestClose();
                }
            }}
        >
            <aside
                role="dialog"
                aria-modal="true"
                aria-label={t('Editar dados do livro')}
                className="absolute inset-y-0 right-0 flex w-115 max-w-full flex-col bg-surface shadow-float inset-ring inset-ring-border"
            >
                <EditorHeader changed={changed} />

                <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-4.5">
                    <LookupSuggestions
                        lookup={lookup}
                        diffs={suggestions.diffs}
                        picked={suggestions.picked}
                        searching={suggestions.searching}
                        dismissed={suggestions.dismissedLookup}
                        onPick={suggestions.pick}
                        onApply={suggestions.applyDiffs}
                    />

                    <TitleSection
                        form={form}
                        preview={preview}
                        coverOpen={coverOpen}
                        onToggleCover={() => setCoverOpen(!coverOpen)}
                    />

                    {coverOpen && <CoverPanel form={form} />}

                    <AuthorsField form={form} />

                    <PagesGenreFields
                        form={form}
                        genres={genres}
                        onShowSessions={onShowSessions}
                    />

                    <PublisherYearFields form={form} />

                    <SeriesFields form={form} />

                    <IsbnField
                        form={form}
                        searching={suggestions.searching}
                        onRefresh={suggestions.refresh}
                    />

                    <Field label={t('Sinopse')} error={form.errors.description}>
                        <Textarea
                            value={form.data.description}
                            onChange={(event) =>
                                form.setData('description', event.target.value)
                            }
                            className="min-h-22 bg-bg text-[13px] leading-relaxed"
                        />
                    </Field>

                    {confirmClose && (
                        <DiscardConfirmation
                            changed={changed}
                            onKeepEditing={keepEditing}
                            onDiscard={onClose}
                        />
                    )}
                </div>

                <EditorFooter
                    processing={form.processing}
                    changed={changed}
                    onCancel={requestClose}
                    onSave={save}
                />
            </aside>
        </div>
    );
}
