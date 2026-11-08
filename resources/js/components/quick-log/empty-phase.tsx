import { Select } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { MinuteGrid } from './minute-grid';
import { startBook } from './session-requests';
import type { AvailableBook } from './types';

export function EmptyPhase({ available }: { available: AvailableBook[] }) {
    const { t } = useTranslation();

    function handleChange(value: string) {
        if (value) {
            startBook(value);
        }
    }

    return (
        <div className="flex flex-1 flex-col gap-3.5">
            <MinuteGrid seconds={0} live={false} />
            <p className="text-sm font-medium text-muted">
                {t('Nenhum livro em andamento.')}
            </p>
            {available.length > 0 && (
                <Select
                    defaultValue=""
                    aria-label={t('Começar a ler')}
                    className="in-data-mobile:h-12 in-data-mobile:text-base"
                    onChange={(event) => handleChange(event.target.value)}
                >
                    <option value="" disabled>
                        {t('Começar um livro de "quero ler"…')}
                    </option>
                    {available.map((book) => (
                        <option key={book.id} value={book.id}>
                            {book.title}
                        </option>
                    ))}
                </Select>
            )}
        </div>
    );
}
