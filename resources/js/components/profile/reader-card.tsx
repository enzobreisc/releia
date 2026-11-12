import { useTranslation } from '@/hooks/use-translation';
import { useReaderEditor } from '@/hooks/use-reader-editor';
import type { Option } from '@/types';
import { LocaleSelect } from './locale-select';
import { ReaderAvatar } from './reader-avatar';
import { ReaderEditForm } from './reader-edit-form';
import { ReaderStats } from './reader-stats';
import { ReaderSummary } from './reader-summary';
import { TopGenres } from './top-genres';
import type { GenreCount, Reader, ReaderTotals } from './types';

export function ReaderCard({
    reader,
    locales,
    since,
    totals,
    genres,
    avatar,
}: {
    reader: Reader;
    locales: Option[];
    since: string;
    totals: ReaderTotals;
    genres: GenreCount[];
    avatar: number[];
}) {
    const { t } = useTranslation();
    const editor = useReaderEditor(reader);

    return (
        <aside
            aria-label={t('Leitor')}
            className="flex max-w-80 min-w-[200px] flex-[1_1_260px] flex-col gap-5"
        >
            <ReaderAvatar avatar={avatar} />

            {editor.editing ? (
                <ReaderEditForm editor={editor} />
            ) : (
                <ReaderSummary
                    reader={reader}
                    since={since}
                    onEdit={editor.startEditing}
                />
            )}

            <LocaleSelect locales={locales} />

            <ReaderStats totals={totals} />

            {genres.length > 0 && <TopGenres genres={genres} />}
        </aside>
    );
}
