import { Link } from '@inertiajs/react';
import { Bookcase } from '@/components/bookcase';
import { MergeShelfDialog } from '@/components/bookcase/merge-shelf-dialog';
import { ShelfNameDialog } from '@/components/bookcase/shelf-name-dialog';
import { cardClass } from '@/components/card';
import { Button, buttonClass } from '@/components/form';
import { MenuItem, MoreMenu } from '@/components/menu';
import { useBookcaseEditing } from '@/hooks/use-bookcase-editing';
import { useTranslation } from '@/hooks/use-translation';
import { buildSections } from '@/lib/shelf/sections';
import type { ShelfSection } from '@/lib/shelf/sections';
import { setup } from '@/routes/bookcase';
import type { BookcaseShelf, LibraryBook } from '@/types';

export function LibraryBookcase({
    books,
    shelves,
    isFiltered,
}: {
    books: LibraryBook[];
    shelves: BookcaseShelf[];
    /** A filtered library hides the shelves left without books. */
    isFiltered: boolean;
}) {
    const { t } = useTranslation();
    const editing = useBookcaseEditing(books);
    const hasShelves = shelves.length > 0;
    const sections = buildSections(books, shelves, {
        includeEmpty: !isFiltered,
    });

    const mergeableShelves = shelves.filter((shelf) => !shelf.is_catch_all);

    function renderActions(section: ShelfSection) {
        if (section.shelfId === null) {
            return null;
        }

        return (
            <MoreMenu label={t('Ações da prateleira')}>
                {(close) => (
                    <>
                        <MenuItem
                            onClick={() => {
                                close();
                                editing.renameShelf(section);
                            }}
                        >
                            {t('Renomear')}
                        </MenuItem>
                        {section.isRemovable && mergeableShelves.length > 1 && (
                            <MenuItem
                                onClick={() => {
                                    close();
                                    editing.mergeShelf(section);
                                }}
                            >
                                {t('Unir com outra prateleira')}
                            </MenuItem>
                        )}
                        {section.isRemovable && (
                            <MenuItem
                                danger
                                onClick={() => {
                                    close();
                                    editing.removeShelf(section);
                                }}
                            >
                                {t('Apagar prateleira')}
                            </MenuItem>
                        )}
                    </>
                )}
            </MoreMenu>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            {hasShelves ? (
                <div className="flex flex-wrap justify-end gap-2.5">
                    <Button variant="ghost" onClick={editing.addShelf}>
                        {t('Nova prateleira')}
                    </Button>
                    <Link href={setup.url()} className={buttonClass('outline')}>
                        {t('Reorganizar')}
                    </Link>
                </div>
            ) : (
                <div
                    className={cardClass(
                        'flex flex-wrap items-center justify-between gap-4 px-6 py-5',
                    )}
                >
                    <div className="flex flex-col gap-1">
                        <p className="text-base font-extrabold tracking-tight">
                            {t('Monte a estante do seu jeito')}
                        </p>
                        <p className="text-[13px] font-medium text-secondary">
                            {t(
                                'Escolha como separar os livros, veja a prévia e aprove.',
                            )}
                        </p>
                    </div>
                    <Link href={setup.url()} className={buttonClass()}>
                        {t('Organizar estante')}
                    </Link>
                </div>
            )}
            <Bookcase
                sections={sections}
                onMove={editing.moveBook}
                onTogglePosture={editing.toggleBookPosture}
                renderActions={renderActions}
            />
            {editing.nameDialog && (
                <ShelfNameDialog
                    shelf={editing.nameDialog.shelf}
                    onClose={editing.closeNameDialog}
                />
            )}
            {editing.mergingShelf && (
                <MergeShelfDialog
                    shelf={editing.mergingShelf}
                    others={mergeableShelves.filter(
                        (shelf) => shelf.id !== editing.mergingShelf?.id,
                    )}
                    onClose={editing.closeMergeDialog}
                />
            )}
        </div>
    );
}
