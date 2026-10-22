import {
    AuthorsIcon,
    HomeIcon,
    LibraryIcon,
    PlusIcon,
    ProfileIcon,
    QueueIcon,
    ShoppingIcon,
    StatsIcon,
    SuggestionsIcon,
    WrappedIcon,
} from '@/components/icons';
import { home } from '@/routes';
import { create as addBook } from '@/routes/books';
import { index as authorsIndex } from '@/routes/authors';
import { index as libraryIndex } from '@/routes/library';
import { index as queueIndex } from '@/routes/queue';
import { index as shoppingIndex } from '@/routes/shopping';
import { show as profileShow } from '@/routes/profile';
import { index as statsIndex } from '@/routes/stats';
import { show as wrappedShow } from '@/routes/wrapped';
import { index as suggestionsIndex } from '@/routes/suggestions';
import type { NavGroup, NavItem } from '@/types';

/** Sidebar groups, in display order. */
export const navGroups: NavGroup[] = [
    { items: [{ title: 'Início', href: home.url(), icon: HomeIcon }] },
    {
        title: 'Acervo',
        items: [
            {
                title: 'Biblioteca',
                href: libraryIndex.url(),
                icon: LibraryIcon,
                count: 'books',
            },
            { title: 'Autores', href: authorsIndex.url(), icon: AuthorsIcon },
        ],
    },
    {
        title: 'Próximas leituras',
        items: [
            {
                title: 'Fila',
                href: queueIndex.url(),
                icon: QueueIcon,
                count: 'queue',
            },
            {
                title: 'Sugestões',
                href: suggestionsIndex.url(),
                icon: SuggestionsIcon,
            },
            {
                title: 'Compras',
                href: shoppingIndex.url(),
                icon: ShoppingIcon,
                count: 'shopping',
            },
        ],
    },
    {
        title: 'Seu histórico',
        items: [
            { title: 'Estatísticas', href: statsIndex.url(), icon: StatsIcon },
            { title: 'Wrapped', href: wrappedShow.url(), icon: WrappedIcon },
            { title: 'Perfil', href: profileShow.url(), icon: ProfileIcon },
        ],
    },
];

export const addBookItem: NavItem = {
    title: 'Adicionar livro',
    href: addBook.url(),
    icon: PlusIcon,
};

/** Everything "Go to" (⌘P) can find. */
export const commandItems: NavItem[] = [
    ...navGroups.flatMap((group) => group.items),
    addBookItem,
];

export function isActive(currentUrl: string, href: string): boolean {
    const path = currentUrl.split('?')[0];

    return href === '/' ? path === '/' : path.startsWith(href);
}
