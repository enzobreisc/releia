import { useTranslation } from '@/hooks/use-translation';
import type { RequestFilters } from '@/types';

type Tag = { key: string; label: string };

export function RequestTags({ filters }: { filters: RequestFilters }) {
    const { t } = useTranslation();
    const tags = tagsOf(filters, t);

    return (
        <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-bold text-secondary">
                {t('Entendi:')}
            </p>
            {tags.map((tag) => (
                <span
                    key={tag.key}
                    className="inline-flex h-7.5 items-center rounded-full bg-elevated px-3 text-[13px] font-bold text-link"
                >
                    {tag.label}
                </span>
            ))}
        </div>
    );
}

function tagsOf(
    filters: RequestFilters,
    t: ReturnType<typeof useTranslation>['t'],
): Tag[] {
    const authorTags = filters.authors.map((name) => ({
        key: `author-${name}`,
        label: t('Autor: :name', { name }),
    }));
    const excludedTags = filters.excludedAuthors.map((name) => ({
        key: `excluded-${name}`,
        label: t('Sem: :name', { name }),
    }));
    const isGeneric = authorTags.length === 0 && excludedTags.length === 0;
    const genericTags: Tag[] = isGeneric
        ? [{ key: 'any-author', label: t('Qualquer autor') }]
        : [];
    const pageTags: Tag[] =
        filters.maxPages === null
            ? []
            : [
                  {
                      key: 'max-pages',
                      label: t('Até :count páginas', {
                          count: filters.maxPages,
                      }),
                  },
              ];

    return [...genericTags, ...authorTags, ...excludedTags, ...pageTags];
}
