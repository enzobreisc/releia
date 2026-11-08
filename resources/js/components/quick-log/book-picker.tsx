import { BookCover } from '@/components/book-cover';
import { Field, Select } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import type { ReadingSummary } from '@/types';
import { START_PREFIX } from './constants';
import { startBook } from './session-requests';
import type { AvailableBook } from './types';

export function BookPicker({
    readings,
    available,
    selected,
    locked,
    onSelect,
}: {
    readings: ReadingSummary[];
    available: AvailableBook[];
    selected: ReadingSummary;
    locked: boolean;
    onSelect: (bookId: number) => void;
}) {
    const { t } = useTranslation();

    function choose(value: string) {
        if (!value.startsWith(START_PREFIX)) {
            onSelect(Number(value));

            return;
        }

        const id = Number(value.slice(START_PREFIX.length));
        startBook(id);
        onSelect(id);
    }

    return (
        <div className="flex items-center gap-3.5">
            <BookCover
                src={selected.cover_url}
                title={selected.title}
                className="w-13 in-data-mobile:w-16"
            />
            <Field label={t('Livro')} className="flex-1 text-[11px]">
                <Select
                    value={String(selected.book_id)}
                    disabled={locked}
                    onChange={(event) => choose(event.target.value)}
                    className="h-10 text-sm font-bold in-data-mobile:h-12 in-data-mobile:text-base"
                >
                    {readings.map((item) => (
                        <option key={item.book_id} value={item.book_id}>
                            {item.title} ·{' '}
                            {t('p. :page', { page: item.current_page })}
                        </option>
                    ))}
                    {!locked && available.length > 0 && (
                        <optgroup label={t('Começar outro livro')}>
                            {available.map((book) => (
                                <option
                                    key={book.id}
                                    value={`${START_PREFIX}${book.id}`}
                                >
                                    {book.title}
                                </option>
                            ))}
                        </optgroup>
                    )}
                </Select>
            </Field>
        </div>
    );
}
