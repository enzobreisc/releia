import {
    HomeIcon,
    LibraryIcon,
    NotesIcon,
    PlusIcon,
    ProfileIcon,
    QueueIcon,
    SparkleIcon,
    StatsIcon,
    WrappedIcon,
} from '@/components/icons';
import { home } from '@/routes';
import { create as addBook } from '@/routes/books';
import { index as libraryIndex } from '@/routes/library';
import { index as notesIndex } from '@/routes/notes';
import { index as queueIndex } from '@/routes/queue';
import { show as profileShow } from '@/routes/profile';
import { index as statsIndex } from '@/routes/stats';
import { show as wrappedShow } from '@/routes/wrapped';
import { index as suggestionsIndex } from '@/routes/suggestions';
import type { NavItem } from '@/types';

/** Grupos da barra lateral, na ordem do escopo (seção 3). */
export const navGroups: NavItem[][] = [
    [
        { title: 'Início', href: home.url(), icon: HomeIcon },
        {
            title: 'Biblioteca',
            href: libraryIndex.url(),
            icon: LibraryIcon,
            count: 'books',
        },
        { title: 'Notas', href: notesIndex.url(), icon: NotesIcon },
        { title: 'Fila', href: queueIndex.url(), icon: QueueIcon },
    ],
    [
        { title: 'Perfil', href: profileShow.url(), icon: ProfileIcon },
        { title: 'Estatísticas', href: statsIndex.url(), icon: StatsIcon },
        { title: 'Wrapped', href: wrappedShow.url(), icon: WrappedIcon },
    ],
    [{ title: 'Sugestões', href: suggestionsIndex.url(), icon: SparkleIcon }],
];

export const addBookItem: NavItem = {
    title: 'Adicionar livro',
    href: addBook.url(),
    icon: PlusIcon,
};

/** Tudo o que o "Ir para" (⌘P) encontra. Livros entram na fase 1. */
export const commandItems: NavItem[] = [...navGroups.flat(), addBookItem];

export function isActive(currentUrl: string, href: string): boolean {
    const path = currentUrl.split('?')[0];

    return href === '/' ? path === '/' : path.startsWith(href);
}
