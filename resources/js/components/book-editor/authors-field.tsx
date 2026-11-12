import { Field } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import type { EditorForm } from './types';
import { useAuthorDraft } from './use-author-draft';

export function AuthorsField({ form }: { form: EditorForm }) {
    const { t } = useTranslation();
    const { authorDraft, setAuthorDraft, addAuthor, onAuthorKey } =
        useAuthorDraft(form);

    return (
        <Field label={t('Autores')} error={form.errors.authors}>
            <span className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-full bg-surface px-2 py-1 inset-ring inset-ring-border">
                {form.data.authors.map((name, index) => (
                    <span
                        key={`${index}:${name}`}
                        className="inline-flex h-7 items-center gap-1.5 rounded-full bg-elevated pr-1 pl-2.5 text-[13px] text-text"
                    >
                        {name}
                        <button
                            type="button"
                            aria-label={t('Tirar :name', { name })}
                            onClick={() =>
                                form.setData(
                                    'authors',
                                    form.data.authors.filter(
                                        (_, position) => position !== index,
                                    ),
                                )
                            }
                            className="size-5 rounded-full text-muted hover:bg-active hover:text-text"
                        >
                            ×
                        </button>
                    </span>
                ))}
                <input
                    value={authorDraft}
                    onChange={(event) => setAuthorDraft(event.target.value)}
                    onKeyDown={onAuthorKey}
                    onBlur={addAuthor}
                    placeholder={
                        form.data.authors.length
                            ? t('adicionar…')
                            : t('Nome do autor')
                    }
                    aria-label={t('Adicionar autor')}
                    className="h-7 min-w-24 flex-1 bg-transparent text-[13px] text-text outline-none placeholder:text-faint"
                />
            </span>
        </Field>
    );
}
