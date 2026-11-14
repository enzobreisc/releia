import { Field, Input, Textarea } from '@/components/form';
import type { BookFormHandle } from '@/components/add-book/book-form';
import { useTranslation } from '@/hooks/use-translation';

type MoreFieldsSectionProps = {
    form: BookFormHandle;
    expanded: boolean;
    onToggle: () => void;
};

export function MoreFieldsSection({
    form,
    expanded,
    onToggle,
}: MoreFieldsSectionProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-2.5">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                className="self-start text-[13px] font-bold text-link hover:text-text"
            >
                {expanded ? '−' : '+'}{' '}
                {t('editora, ano, série, ISBN e descrição')}
            </button>
            {expanded && <MoreFields form={form} />}
        </div>
    );
}

function MoreFields({ form }: { form: BookFormHandle }) {
    const { t } = useTranslation();

    return (
        <>
            <Field label={t('Subtítulo')} error={form.errors.subtitle}>
                <Input
                    value={form.data.subtitle}
                    onChange={(event) =>
                        form.setData('subtitle', event.target.value)
                    }
                />
            </Field>
            <div className="flex flex-wrap gap-3">
                <Field
                    label={t('Editora')}
                    error={form.errors.publisher}
                    className="flex-[2_1_160px]"
                >
                    <Input
                        value={form.data.publisher}
                        onChange={(event) =>
                            form.setData('publisher', event.target.value)
                        }
                    />
                </Field>
                <Field
                    label={t('Ano')}
                    error={form.errors.published_year}
                    className="flex-[1_1_80px]"
                >
                    <Input
                        type="number"
                        value={form.data.published_year}
                        onChange={(event) =>
                            form.setData('published_year', event.target.value)
                        }
                    />
                </Field>
            </div>
            <div className="flex flex-wrap gap-3">
                <Field
                    label={t('Série')}
                    error={form.errors.series}
                    className="flex-[2_1_160px]"
                >
                    <Input
                        value={form.data.series}
                        onChange={(event) =>
                            form.setData('series', event.target.value)
                        }
                    />
                </Field>
                <Field
                    label={t('Volume')}
                    error={form.errors.series_position}
                    className="flex-[1_1_80px]"
                >
                    <Input
                        type="number"
                        min={1}
                        value={form.data.series_position}
                        onChange={(event) =>
                            form.setData('series_position', event.target.value)
                        }
                    />
                </Field>
            </div>
            <Field label="ISBN" error={form.errors.isbn_13}>
                <Input
                    value={form.data.isbn_13}
                    onChange={(event) =>
                        form.setData('isbn_13', event.target.value)
                    }
                    className="font-mono"
                />
            </Field>
            <Field label={t('Descrição')} error={form.errors.description}>
                <Textarea
                    value={form.data.description}
                    onChange={(event) =>
                        form.setData('description', event.target.value)
                    }
                />
            </Field>
        </>
    );
}
